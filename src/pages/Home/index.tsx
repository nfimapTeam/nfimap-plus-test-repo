import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// import { Box, Flex, Image } from '@chakra-ui/react'
// import { Swiper, SwiperSlide } from 'swiper/react'
// import { Autoplay } from 'swiper/modules'
// import type { Swiper as SwiperType } from 'swiper'
// import 'swiper/css'

const Home = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/nfiti')
  }, [navigate])

  return null

  // const bannerImages = [
  //   '/image/banner/banner1.webp',
  //   '/image/banner/banner2.webp',
  // ]
  // const [currentSlide, setCurrentSlide] = useState(1)

  // return (
  //   <Box position="relative">
  //     <Swiper
  //       spaceBetween={0}
  //       slidesPerView={1}
  //       loop={true}
  //       autoplay={{
  //         delay: 4000,
  //         disableOnInteraction: false,
  //       }}
  //       modules={[Autoplay]}
  //       onSlideChange={(swiper: SwiperType) => {
  //         setCurrentSlide(swiper.realIndex + 1)
  //       }}
  //     >
  //       {bannerImages.map((image, index) => (
  //         <SwiperSlide key={index}>
  //           <Image 
  //             src={image}
  //             alt={`배너 이미지 ${index + 1}`}
  //             height="360px"
  //             width="100%"
  //             objectFit="cover"
  //           />
  //         </SwiperSlide>
  //       ))}
  //     </Swiper>
  //     <Box
  //       position="absolute"
  //       bottom="10px"
  //       right="10px"
  //       backgroundColor="rgba(0, 0, 0, 0.5)"
  //       color="white"
  //       padding="4px 8px"
  //       borderRadius="4px"
  //       fontSize="14px"
  //       zIndex="1"
  //     >
  //       {currentSlide}/{bannerImages.length}
  //     </Box>
  //   </Box>
  // )
}

export default Home
