import { Flex, Image, Text } from "@chakra-ui/react";
import React from "react";

const Loading = () => {
  return (
    <Flex
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      flexDirection="column"
      justify="center"
      align="center"
      p={8}
    >
      <Image
        src="/image/nfiti/loading/loading-gif.gif"
        alt="로딩 이미지"
        width="100px"
        height="100px"
        objectFit="contain"
        objectPosition="center"
        loading="lazy"
      />

      <Text
        fontSize="2xl"
        fontFamily='"UhBeeSe_hyun", serif'
        textAlign="center"
        color="purple.600"
        mt={4}
      >
        로딩중...
      </Text>
    </Flex>
  );
};

export default Loading;
