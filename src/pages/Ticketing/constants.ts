export interface DistractionMember {
  name: string;
  avatar: string;
  messages: string[];
  congratMessage: string;
  youtubeReplyMessage: string;
}

export const DISTRACTION_MEMBERS: DistractionMember[] = [
  {
    name: "김재현 🥁",
    avatar: "/image/member/jaehyun.webp",
    messages: [
      "엔피아 뭐해?",
      "티켓팅중이구나 ㅎㅎ",
      "나랑 놀자아아~",
      "자리 좋은 데 잡아야해!! 🥁",
      "두구두구두구... 과연 결과는?!",
      "심심하다.. 나랑 수다 떨 사람 🙋",
      "이번 콘서트 진짜 재밌을거야 ㅋㅋㅋ",
      "올리브영 최고!"
    ],
    congratMessage: "대박 대박!! 내 콘서트 티켓팅 성공했구나? 🥁 얼른 와서 내 드럼 치는 거 멋있게 봐줘! 진짜 신나게 흔들어재껴보자고오오!!",
    youtubeReplyMessage: "오오 진짜?? 미안 방해했네 ㅋㅋㅋ 대박 좋은 자리 잡아라 화이팅!! 🥳🥁"
  },
  {
    name: "서동성 🎸",
    avatar: "/image/member/dongsung.webp",
    messages: [
      "행복한 주말 보내!",
      "월요일 화이팅!!!",
      "엔피아~",
    ],
    congratMessage: "와! 예매 성공 축하드려요!! 🎸🔥 열심히 준비하고 있을 테니까 콘서트 날 건강한 모습으로 만나요! 우리 동성이가 아주 끝내주는 베이스 연주 들려드릴게요!",
    youtubeReplyMessage: "앗 티켓팅 중이시구나! 제 기운을 받아서 꼭 1열 잡으세요!! 🎸🔥"
  },
  {
    name: "먐미 🐱",
    avatar: "/image/member/chahun.webp",
    messages: [
      "오늘 날씨 좋네 ☀️",
      "로망이 사진 🐱",
      "🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕🥕"
    ],
    congratMessage: "예매 성공했네. 고생했다. 🐱 당일 날 로망이처럼 깜찍하고 멋진 모습 많이 보여줄 테니까 기대해도 좋아. 🥕 늦지 말고 조심히 와.",
    youtubeReplyMessage: "티켓팅 방해해서 미안해요. 꼭 좋은 좌석 예매 성공하시길 바랄게요! 🐱🍀"
  },
  {
    name: "이승협 🦁",
    avatar: "/image/member/seunghyub.webp",
    messages: [
      "엔피아 밥 먹었어요? 🍚",
      "오늘도 고마워요 💙",
      "옥탑방 같이 들어요 🎵",
      "티켓팅 화이팅!",
    ],
    congratMessage: "엔피아! 예매 성공했네요! 🦁💙 내 목소리 들으러 옥탑방으로 올 준비 완료된 거죠? 너무 고맙고, 콘서트 날 우리 신나게 같이 놀아요!",
    youtubeReplyMessage: "아 진짜요? 옥탑방 1열 가야죠!! 대박 파이팅!! 🦁💙"
  },
  {
    name: "유회승 🎤",
    avatar: "/image/member/hewseung.webp",
    messages: [
      "오늘 노래 연습 완료! 🎤",
      "엔피아 보고 싶다아아아",
      "감기 조심해요!! 🤧",
      "1열 와서 내 목소리 직접 들어줘!",
    ],
    congratMessage: "와아아아 대단해요!!! 🎤🔥 제 고음 폭발 라이브를 드디어 1열에서(?) 들으실 수 있겠네요! 목 관리 열심히 해둘게요, 우리 그날 같이 소리 질러봐요!!",
    youtubeReplyMessage: "와!! 티켓팅 대박 성공해서 제 고음 라이브 1열에서 들어줘요!! 🎤🔥"
  }
];

export const YOUTUBE_CHANNELS = [
  { name: "승협이", avatar: "/image/member/seunghyub.webp", content: "승협이의 깜짝 라이브 🎙️ - [LIVE] 엔피아 다들 모여라!" },
  { name: "하루의 마무리", avatar: "/image/member/hewseung.webp", content: "오늘 하루도 수고했어.. 위로가 되는 노래 한 소절 🎵" },
  { name: "두얼간이", avatar: "/image/member/jaehyun.webp", content: "훈이 재현이의 본격 먹방 투어! 맛집 대공개!! 🍗" }
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
  // Default to 먐미 (차훈)
  return DISTRACTION_MEMBERS.find(m => m.name.includes("먐미"))?.youtubeReplyMessage || "";
};
