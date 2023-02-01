import { Post } from '../entities/Post';
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { MyContext } from '../types';
import { isAuth } from '../middleware/isAuth';
import { getConnection } from 'typeorm';
import { Updoot } from '../entities/Updoot';
import { User } from '../entities/User';

// int and string types are inferred by type-graphql; optional to include

// all im doing is defining the functions here

@InputType()
class PostInput {
    @Field()
    title: string;
    @Field()
    text: string;
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[];
    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() root: Post) {
        return root.text.slice(0, 50);
    }

    // Field resolve will only run if its included in the graphql query
    // ex if u remove creator from posts query this will not get executed
    @FieldResolver(() => User)
    creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(@Root() post: Post, @Ctx() { req, updootLoader }: MyContext) {
        if (!req.session.userId) {
            return null;
        }
        const updoot = await updootLoader.load({ postId: post.id, userId: req.session.userId });

        return updoot ? updoot.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(@Arg('postId', () => Int) postId: number, @Arg('value', () => Int) value: number, @Ctx() { req }: MyContext) {
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1 : -1;
        const { userId } = req.session;
        const updoot = await Updoot.findOne({ where: { postId, userId } });

        //user has voted before and are changing their vote
        if (updoot && updoot.value !== realValue) {
            await getConnection().transaction(async (tm) => {
                await tm.query(
                    `
                update updoot
                set value = $1
                where "postId" = $2 and "userId" = $3`,
                    [realValue, postId, userId]
                );
                await tm.query(
                    `
                    update post
                    set points = points + $1
                    where id = $2
                `,
                    [2 * realValue, postId]
                );
            });
        } else if (!updoot) {
            //user hasn't voted before
            await getConnection().transaction(async (tm) => {
                await tm.query(
                    `
                    insert into updoot("userId", "postId", value)
                    values ($1, $2, $3)
                `,
                    [userId, postId, realValue]
                );

                await tm.query(
                    `
                    update post
                    set points = points + $1
                    where id = $2
                `,
                    [realValue, postId]
                );
            });
        }

        await Updoot.insert({
            userId,
            postId,
            value: realValue,
        });
        return true;
    }

    @Query(() => PaginatedPosts) // In TypeGraphQL need to declare what query returns, [Post] is array of Posts //number defaults to Float, need to cast to Int
    async posts(@Arg('limit', () => Int) limit: number, @Arg('cursor', () => String, { nullable: true }) cursor: string | null, @Ctx() { req }: MyContext): Promise<PaginatedPosts> {
        // When setting something to nullable, must explicitly set the type
        // Type declarations are duplicated when using type-graphql and typescript
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;

        const replacements: any[] = [realLimitPlusOne];

        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }
        console.log('user id in post resolver', req.session.userId);
        const posts = await getConnection().query(
            `
            select p.*
            from post p
            ${cursor ? `where p."createdAt" < $2` : ''}
            order by p."createdAt" DESC
            limit $1
        `,
            replacements
        );

        // const qb = getConnection()
        //     .getRepository(Post)
        //     .createQueryBuilder('p') // p is alias for post
        //     .innerJoinAndSelect('p.creator', 'u', 'u.id = p."creatorId"') //u (alias) for user, join on 3rd column
        //     .orderBy('p."createdAt"', 'DESC')
        //     .take(realLimitPlusOne);
        // if (cursor) {
        //     qb.where('p."createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) });
        // }

        //const posts = await qb.getMany();

        return { posts: posts.slice(0, realLimit), hasMore: posts.length === realLimitPlusOne };
    }

    @Query(() => Post, { nullable: true })
    post(@Arg('id', () => Int) id: number): Promise<Post | null> {
        return Post.findOne({ where: { id } });
    }

    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(@Arg('input') input: PostInput, @Ctx() { req }: MyContext): Promise<Post> {
        return Post.create({ ...input, creatorId: req.session.userId }).save();
    }

    @Mutation(() => Post, { nullable: true })
    @UseMiddleware(isAuth)
    async updatePost(@Arg('id', () => Int) id: number, @Arg('title') title: string, @Arg('text') text: string, @Ctx() { req }: MyContext): Promise<Post | null> {
        const post = await getConnection().createQueryBuilder().update(Post).set({ title, text }).where('id = :id and "creatorId" = :creatorId', { id, creatorId: req.session.userId }).returning('*').execute();
        return post.raw[0];
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async deletePost(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<boolean> {
        // not cascading delete
        const post = await Post.findOne({ where: { id } });
        if (!post) {
            return false;
        }
        if (post.creatorId !== req.session.userId) {
            throw new Error(`Not authorized.`);
        }
        await Updoot.delete({ postId: id });
        await Post.delete({ id });

        // await Post.delete({ id, creatorId: req.session.userId });
        return true;
    }
}
