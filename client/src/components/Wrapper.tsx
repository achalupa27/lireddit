import { Box } from '@chakra-ui/react';
import React from 'react';

export type WrapperVariant = 'small' | 'regular';

interface WrapperProps {
    children: React.ReactNode;
    variant?: WrapperVariant;
}

export const Wrapper: React.FC<WrapperProps> = ({ children, variant = 'regular' }) => {
    return (
        <Box maxW={variant === 'regular' ? '880px' : '400px'} w='100%' mt={8} mx='auto'>
            {children}
        </Box>
    );
};
