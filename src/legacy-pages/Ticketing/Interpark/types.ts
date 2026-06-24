export interface SectionSeatData {
  id: string;
  name: string;
  type: "FLOOR" | "1F" | "2F";
  color: string;
  initialSeats: number;
  remainingSeats: number;
  depleteSpeed: number;
}

export interface SeatData {
  rowName: string;
  colIndex: number;
  status: "available" | "occupied" | "selected";
  id: string;
  hijacked?: boolean;
  disappearTime?: number;
  seatDelay?: number;
}
