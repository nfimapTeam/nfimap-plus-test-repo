export interface DistractionMember {
  name: string;
  realName: string;
  avatar: string;
  messages: string[];
  congratMessage: string;
  youtubeReplyMessage: string;
}

export const DISTRACTION_MEMBERS: DistractionMember[] = [
  {
    name: "나?김재현 바로바로 멋쟁이란말이지!핳",
    realName: "김재현",
    avatar: "/image/member/jaehyun.webp",
    messages: [
      "엔피아 뭐해유? ㅇㅅㅇ?",
      "올영에서 엔피아 자만추..",
      "나랑 놀자아아아 ㅇㅂㅇ/",
      "두구두구두구... 과연 결과는?!",
      "여왕님이랑 수다 떨다 왔어요 ㅇㅂㅇ",
      "이번 공연 두닥두닥 콩근콩근 기대해주세요",
    ],
    congratMessage: "대박 대박!! 엔피아 콘서트 티켓팅 성공했구나? ㅇㅂㅇ/ 저 이번에 한정판 스네어 새로 산 거 알쥬!!🥁 진짜 끝내주는 드럼 연주 보여줄 테니까 기대해도좋음ㅇㅅㅇ ",
    youtubeReplyMessage: "😍해피 바이러스 쭈르미ㅇㅂㅇ/"
  },
  {
    name: "동성이",
    realName: "서동성",
    avatar: "/image/member/dongsung.webp",
    messages: [
      "행복한 주말 되세요☺️",
      "월요일 시작!! 오늘도 화이팅😍",
      "엔피아 만나려면 열심히 운동해야지😉",
    ],
    congratMessage: "와아아!! 엔피아 예매 성공 축하해요❤️ 저희도 열심히 준비하구 있을 테니까 콘서트 날 건강한 모습으로 만나요🫰",
    youtubeReplyMessage: "엔피아에게 떼굴떼굴🤗"
  },
  {
    name: "먐미 🐱",
    realName: "차훈",
    avatar: "/image/member/chahun.webp",
    messages: [
      "혹시 하이염 보러올 생각 있어?",
      "우리 로망이 사진 볼 사람!😺",
      "🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕",
      "아농! 😸"
    ],
    congratMessage: "오 예매 성공했구나!😻 이번에 기타 세팅도 새로 하고 진짜 바쁘게 준비 중이니까 기대해도 좋아🎸 우리 엔피아들 조심히 와야해! 아농!😸",
    youtubeReplyMessage: "하이염😸"
  },
  {
    name: "승협이",
    realName: "이승협",
    avatar: "/image/member/seunghyub.webp",
    messages: [
      "엔피아 밥 먹었어? 🍚",
      "오늘도 고마워어어 !! ㅎㅎㅎ",
      "옥탑방 같이 듣자 !!",
      "티켓팅 화이팅하고 !! 딱 기다려",
    ],
    congratMessage: "와 예매 성공했네 !! 후회 없게 만들어줄 테니까 딱 기다려. 너무 고맙구 콘서트 날 우리 신나게 같이 놀자. 잘자구 내일봐❤️",
    youtubeReplyMessage: "버터런을 해서 까르보나라를 만들어보자! "
  },
  {
    name: "승구링끼",
    realName: "유회승",
    avatar: "/image/member/hewseung.webp",
    messages: [
      "오늘도 참 좋아라!!!👍",
      "엔피아 밥 먹었어?ㅎㅎ",
      "저녁 맛있게 먹고 감기 조심해!!ㅎㅎ",
      "티켓팅 성공해서 내 라이브 직접 들어줘~ㅋㅋㅋ",
    ],
    congratMessage: "이야... 이게 되네...?! 😲 진짜 성공한거지?! ㅋㅋㅋ 축하해에!! ㅎㅎ 목 관리 열심히 해둘 테니까 그날 아주 신나게 놀아보자구~",
    youtubeReplyMessage: "[하루의 마무리] 2025.05.20 하루의 마무리(하.마)"
  }
];

export const YOUTUBE_CHANNELS = [
  {
    name: "승협이",
    avatar: "/image/member/seunghyub.webp",
    content: "[LIVE] 우리 잠깐 얘기 좀 합시다"
  },
  {
    name: "유회승 Yoo Hwe Seung",
    avatar: "/image/member/hewseung.webp",
    content: "[LIVE] 승구리당당수다당!"
  },
  {
    name: "두얼간이 2IDIOTS",
    avatar: "/image/member/jaehyun.webp",
    content: "[LIVE] 툭툭)알이즈웰! 돌아온 두얼간이😸🐶"
  }
];

export const getYoutubeReplyMessage = (sender: string): string => {
  if (sender.includes("재현")) {
    return DISTRACTION_MEMBERS.find(m => m.name.includes("재현"))?.youtubeReplyMessage || "";
  }
  if (sender.includes("동성")) {
    return DISTRACTION_MEMBERS.find(m => m.name.includes("동성"))?.youtubeReplyMessage || "";
  }
  if (sender.includes("승협")) {
    return DISTRACTION_MEMBERS.find(m => m.name.includes("승협"))?.youtubeReplyMessage || "";
  }
  if (sender.includes("회승")) {
    return DISTRACTION_MEMBERS.find(m => m.name.includes("회승"))?.youtubeReplyMessage || "";
  }
  return DISTRACTION_MEMBERS.find(m => m.name.includes("차훈"))?.youtubeReplyMessage || "";
};
