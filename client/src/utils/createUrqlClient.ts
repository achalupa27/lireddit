import { dedupExchange, fetchExchange } from '@urql/core';
import { cacheExchange, Resolver, Cache } from '@urql/exchange-graphcache';
import { Exchange, gql, stringifyVariables } from 'urql';
import { pipe, tap } from 'wonka';
import { DeletePostMutationVariables, LoginMutation, LogoutMutation, MeDocument, MeQuery, RegisterMutation, VoteMutationVariables } from '../generated/graphql';
import { betterUpdateQuery } from './betterUpdateQuery';
import Router from 'next/router';
import { isServer } from './isServer';

// this allows us to catch all errors; can handle errors at a global level
export const errorExchange: Exchange =
    ({ forward }) =>
    (ops$) => {
        return pipe(
            forward(ops$),
            tap(({ error }) => {
                if (error?.message.includes('Not authenticated.')) {
                    Router.replace('/login');
                }
            })
        );
    };

// function returns resolver; arguments are from client-side resolver
// read data from cache and return
const cursorPagination = (): Resolver => {
    return (_parent, fieldArgs, cache, info) => {
        const { parentKey: entityKey, fieldName } = info;
        console.log('entityKey, fieldName: ', entityKey + ', ', fieldName);

        const allFields = cache.inspectFields(entityKey); // allFields contains all queries we have stored in the cache
        console.log('allFields: ', allFields);

        const fieldInfos = allFields.filter((info) => info.fieldName === fieldName);
        console.log('fieldInfos: ', fieldInfos);

        const size = fieldInfos.length;
        if (size === 0) {
            return undefined;
        }

        console.log('fieldArgs: ', fieldArgs);
        const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
        console.log('key we created: ', fieldKey);

        const isInCache = cache.resolve(cache.resolveFieldByKey(entityKey, fieldKey) as string, 'posts');
        console.log('isInCache: ', isInCache);

        info.partial = !isInCache;
        const results: string[] = [];
        let hasMore = true;
        // fieldInfos increases as we load more items/paginate, then combines all pages into results
        // loop through cache and look for all paginated queries done
        // if any hasMore is false, set hasMore to false
        fieldInfos.forEach((fi) => {
            const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string;
            const data = cache.resolve(key, 'posts') as string[];
            const _hasMore = cache.resolve(key, 'hasMore');
            if (!_hasMore) {
                hasMore = _hasMore as boolean;
            }
            results.push(...data);
        });
        console.log('results: ', results);
        console.log('-------------------------------------------------------');
        return {
            __typename: 'PaginatedPosts',
            hasMore,
            posts: results,
        };
    };
};

function invalidateAllPosts(cache: Cache) {
    const allFields = cache.inspectFields('Query');
    const fieldInfos = allFields.filter((info) => info.fieldName === 'posts');
    fieldInfos.forEach((fi) => {
        cache.invalidate('Query', 'posts', fi.arguments);
    });
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => {
    // let cookie: any = '';
    // let cookieString = '';
    // if (isServer()) {
    //     cookie = ctx?.req?.cookies;
    //     cookieString = Object.keys(cookie)[0] + '=' + cookie.qid;
    //     console.log(cookieString);
    // }

    return {
        url: process.env.NEXT_PUBLIC_API_URL as string,
        fetchOptions: {
            credentials: 'include' as const,
            //headers: cookie ? cookie : undefined,
        },
        exchanges: [
            dedupExchange,
            cacheExchange({
                keys: {
                    PaginatedPosts: () => null,
                },
                resolvers: {
                    Query: {
                        posts: cursorPagination(),
                    },
                },
                updates: {
                    Mutation: {
                        deletePost: (_result, args, cache, info) => {
                            cache.invalidate({ __typename: 'Post', id: (args as DeletePostMutationVariables).id });
                        },
                        vote: (_result, args, cache, info) => {
                            const { postId, value } = args as VoteMutationVariables;
                            const data = cache.readFragment(
                                gql`
                                    fragment _ on Post {
                                        id
                                        points
                                        voteStatus
                                    }
                                `,
                                { id: postId }
                            );
                            if (data) {
                                if (data.voteStatus === value) {
                                    return;
                                }
                                const newPoints = data.points + (!data.voteStatus ? 1 : 2) * value;
                                cache.writeFragment(
                                    gql`
                                        fragment _ on Post {
                                            points
                                            voteStatus
                                        }
                                    `,
                                    { id: postId, points: newPoints, voteStatus: value }
                                );
                            }
                        },
                        createPost: (_result, args, cache, info) => {
                            invalidateAllPosts(cache);
                        },
                        logout: (_result, args, cache, info) => {
                            betterUpdateQuery<LogoutMutation, MeQuery>(cache, { query: MeDocument }, _result, () => ({ me: null }));
                        },
                        login: (_result, args, cache, info) => {
                            betterUpdateQuery<LoginMutation, MeQuery>(cache, { query: MeDocument }, _result, (result, query) => {
                                if (result.login.errors) {
                                    return query;
                                } else {
                                    return {
                                        me: result.login.user,
                                    };
                                }
                            });
                            invalidateAllPosts(cache);
                        },
                        register: (_result, args, cache, info) => {
                            betterUpdateQuery<RegisterMutation, MeQuery>(cache, { query: MeDocument }, _result, (result, query) => {
                                if (result.register.errors) {
                                    return query;
                                } else {
                                    return {
                                        me: result.register.user,
                                    };
                                }
                            });
                        },
                    },
                },
            }),
            errorExchange,
            ssrExchange,
            fetchExchange,
        ],
    };
};
