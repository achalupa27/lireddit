import { Box, Button, Flex, Link } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { NextPage } from 'next';
import { withUrqlClient } from 'next-urql';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { InputField } from '../../components/InputField';
import { Wrapper } from '../../components/Wrapper';
import { useChangePasswordMutation } from '../../generated/graphql';
import { createUrqlClient } from '../../utils/createUrqlClient';
import { toErrorMap } from '../../utils/toErrorMap';
import NextLink from 'next/link';

const ChangePassword: NextPage = () => {
    const router = useRouter();
    const [, changePassword] = useChangePasswordMutation();
    const [tokenError, setTokenError] = useState('');
    return (
        <Wrapper variant='small'>
            <Formik
                initialValues={{ newPassword: '' }}
                onSubmit={async (values, { setErrors }) => {
                    const response = await changePassword({ newPassword: values.newPassword, token: typeof router.query.token === 'string' ? router.query.token : '' });
                    if (response.data?.changePassword.errors) {
                        const errorMap = toErrorMap(response.data.changePassword.errors);
                        if ('token' in errorMap) {
                            setTokenError(errorMap.token);
                        }
                        setErrors(errorMap); // don't need ? after data b/c ts infers it is defined from if
                    } else if (response.data?.changePassword.user) {
                        // login worked
                        router.push('/');
                    }
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <InputField name='newPassword' placeholder='New Password' label='New Password' type='password' />
                        {tokenError ? (
                            <Flex>
                                <Box mr={2} color='red'>
                                    {tokenError}
                                </Box>
                                <Box>
                                    <NextLink href='/forgot-password'>
                                        <Link>Get a new token here.</Link>
                                    </NextLink>
                                </Box>
                            </Flex>
                        ) : null}
                        <Button mt={4} type='submit' isLoading={isSubmitting} color='teal'>
                            Change Password
                        </Button>
                    </Form>
                )}
            </Formik>
        </Wrapper>
    );
};

export default withUrqlClient(createUrqlClient, { ssr: false })(ChangePassword);
