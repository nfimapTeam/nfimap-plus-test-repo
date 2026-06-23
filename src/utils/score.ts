export interface SeatConfig {
  level: "floor" | "2f";
  block: "front" | "back";
  row: number; // 0-indexed row number (A = 0, B = 1, etc.)
}

export function getBaseScore(seat: SeatConfig, numRows: number): number {
  const { level, block, row } = seat;
  const maxRowIndex = Math.max(1, numRows - 1);
  
  // Map row index (0 to numRows - 1) linearly to a normalized 10-row index (0 to 9)
  const normalizedRow = (row / maxRowIndex) * 9;
  
  let base = 0;

  if (level === "floor") {
    if (block === "front") {
      // 200 to 110 (10 points decrement per step of 10 rows)
      base = 200 - normalizedRow * 10;
    } else {
      // 100 to 10 (10 points decrement per step of 10 rows)
      base = 100 - normalizedRow * 10;
    }
  }

  if (level === "2f") {
    if (block === "front") {
      // 120 to 75 (5 points decrement per step of 10 rows)
      base = 120 - normalizedRow * 5;
    } else {
      // 70 to 25 (5 points decrement per step of 10 rows)
      base = 70 - normalizedRow * 5;
    }
  }

  return Math.round(base);
}

export function getInterparkSeatScore(sectionId: string, rowName: string): number {
  const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
  const rowIndex = rowNamesList.indexOf(rowName);
  const row = rowIndex !== -1 ? rowIndex : 0;

  const isFloor = sectionId.startsWith("F");
  const numRows = isFloor ? 20 : 16;

  let level: "floor" | "2f" = "2f";
  let block: "front" | "back" = "back";

  if (sectionId === "F1" || sectionId === "F2") {
    level = "floor";
    block = "front";
  } else if (sectionId === "F3" || sectionId === "F4") {
    level = "floor";
    block = "back";
  } else if (sectionId.startsWith("1")) {
    level = "2f";
    block = "front";
  } else if (sectionId.startsWith("2")) {
    level = "2f";
    block = "back";
  }

  return getBaseScore({ level, block, row }, numRows);
}

export function getTicketlinkSeatScore(sectionName: string, rowName: string): number {
  const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"];
  const rowIndex = rowNamesList.indexOf(rowName);
  const row = rowIndex !== -1 ? rowIndex : 0;

  let numRows = 12;
  if (sectionName === "가" || sectionName === "나") numRows = 14;
  else if (sectionName === "다" || sectionName === "라" || sectionName === "마") numRows = 12;
  else if (sectionName === "바" || sectionName === "아") numRows = 24;
  else if (sectionName === "사") numRows = 8;

  let level: "floor" | "2f" = "2f";
  let block: "front" | "back" = "back";

  if (sectionName === "가" || sectionName === "나") {
    level = "floor";
    block = "front";
  } else if (sectionName === "다" || sectionName === "라" || sectionName === "마") {
    level = "floor";
    block = "back";
  } else if (sectionName === "바" || sectionName === "아") {
    level = "2f";
    block = "front";
  } else if (sectionName === "사") {
    level = "2f";
    block = "back";
  }

  return getBaseScore({ level, block, row }, numRows);
}

export function getFinalScore(baseScore: number, responseTime: number): number {
  const rTime = Math.max(0.01, responseTime);
  const seatScore = baseScore * 40;
  const speedBonus = 1000 / (rTime + 0.5);
  return Math.round(seatScore + speedBonus);
}

