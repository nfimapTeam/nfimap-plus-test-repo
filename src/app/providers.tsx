'use client';

import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RecoilRoot>
      <ChakraProvider>
        {children}
      </ChakraProvider>
    </RecoilRoot>
  );
}
