import { Button, Box } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { withUrqlClient } from 'next-urql';
import { useRouter } from 'next/router';
import { InputField } from '../../../components/InputField';
import { Layout } from '../../../components/Layout';
import { usePostQuery, useUpdatePostMutation } from '../../../generated/graphql';
import { createUrqlClient } from '../../../utils/createUrqlClient';
import { useGetIntId } from '../../../utils/useGetIntId';

const EditPost = ({}) => {
    const router = useRouter();
    const intId = useGetIntId();
    const [, updatePost] = useUpdatePostMutation();
    const [{ data, error, fetching }] = usePostQuery({
        pause: intId === -1,
        variables: {
            id: intId,
        },
    });

    if (fetching) {
        return (
            <Layout>
                <div>Loading...</div>
            </Layout>
        );
    }

    if (!data?.post) {
        return (
            <Layout>
                <Box>Could not find post.</Box>
            </Layout>
        );
    }
    return (
        <Layout variant='small'>
            <Formik
                initialValues={{ title: data.post.title, text: data.post.text }}
                onSubmit={async (values) => {
                    await updatePost({ id: intId, ...values /*title: values.title, text: values.text*/ });
                    router.back();
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <InputField name='title' placeholder='Title' label='Title' />
                        <Box mt={4} />
                        <InputField textarea name='text' placeholder='text...' label='Body' />
                        <Button mt={4} type='submit' isLoading={isSubmitting} color='teal'>
                            Update Post
                        </Button>
                    </Form>
                )}
            </Formik>
        </Layout>
    );
};

export default withUrqlClient(createUrqlClient)(EditPost);
function userRouter() {
    throw new Error('Function not implemented.');
}
