export interface SectionSeatData {
  id: string;
  name: string;
  type: "FLOOR" | "2F" | "3F";
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
}
