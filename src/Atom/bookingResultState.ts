import { atom } from "recoil";

export const bookingResultState = atom<boolean>({
  key: "bookingResultState",
  default: false,
});
