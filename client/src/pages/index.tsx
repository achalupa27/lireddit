import { withUrqlClient } from 'next-urql';
import { createUrqlClient } from '../utils/createUrqlClient';
import { usePostsQuery } from '../generated/graphql';
import { Layout } from '../components/Layout';
import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useState } from 'react';
import { UpdootSection } from '../components/UpdootSection';
import { EditDeletePostButtons } from '../components/EditDeletePostButtons';

const Index = () => {
    const [variables, setVariables] = useState({ limit: 15, cursor: null as null | string });
    const [{ data, error, fetching }] = usePostsQuery({
        variables,
    });

    if (!fetching && !data) {
        return <div>Query failed. {error?.message}</div>;
    }

    return (
        <Layout>
            {!data && fetching ? (
                <div>Loading...</div>
            ) : (
                <Stack spacing={8}>
                    {data!.posts.posts.map((p) =>
                        !p ? null : (
                            <Flex key={p.id} p={5} shadow='md' borderWidth='1px' align='center'>
                                <UpdootSection post={p} />
                                <Box flex={1}>
                                    <NextLink href='/post/[id]' as={`/post/${p.id}`}>
                                        <Box>
                                            <Heading fontSize='xl'>{p.title}</Heading>
                                        </Box>
                                    </NextLink>
                                    <Text>posted by {p.creator.username}</Text>
                                    <Flex>
                                        <Text flex={1} mt={4}>
                                            {p.textSnippet}
                                        </Text>
                                        <EditDeletePostButtons id={p.id} creatorId={p.creator.id} />
                                    </Flex>
                                </Box>
                            </Flex>
                        )
                    )}
                </Stack>
            )}

            {data && data.posts.hasMore ? (
                <Flex>
                    <Button onClick={() => setVariables({ limit: variables.limit, cursor: data.posts.posts[data.posts.posts.length - 1].createdAt })} isLoading={fetching} m='auto' my={8}>
                        Load more
                    </Button>
                </Flex>
            ) : null}
        </Layout>
    );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
function useDeleteMutation(): [any, any] {
    throw new Error('Function not implemented.');
}
