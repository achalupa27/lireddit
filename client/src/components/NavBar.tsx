import { Box, Button, Flex, Heading } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useLogoutMutation, useMeQuery } from '../generated/graphql';
import { useRouter } from 'next/router';

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
    const router = useRouter();
    const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
    // const [isServer, setIsServer] = useState(true);

    // useEffect(() => setIsServer(false), []);

    const [{ data, fetching }] = useMeQuery({
        //   pause: isServer, // tells query not to run (on server)
    });

    let body = null;

    if (fetching) {
        // data loading
    } else if (!data?.me) {
        // user not logged in
        body = (
            <>
                <Flex>
                    <NextLink href='/login'>
                        <Box color='white' mr={2}>
                            Login
                        </Box>
                    </NextLink>
                    <NextLink href='/register'>
                        <Box color='white'>Register</Box>
                    </NextLink>
                </Flex>
            </>
        );
    } else {
        // user logged in
        body = (
            <Flex>
                <Box mr={2}>{data.me.username}</Box>
                <Button
                    variant='link'
                    onClick={async () => {
                        await logout(undefined as any);
                        router.reload();
                    }}
                    isLoading={logoutFetching}
                >
                    Log Out
                </Button>
            </Flex>
        );
    }
    return (
        <Flex position='sticky' top={0} zIndex={1} bg='tomato' p={4} align='center'>
            <NextLink href='/'>
                <Box>
                    <Heading>LiReddit</Heading>
                </Box>
            </NextLink>
            <NextLink href='/create-post'>
                <Button>Create Post</Button>
            </NextLink>
            <Box ml={'auto'}>{body}</Box>
        </Flex>
    );
};
