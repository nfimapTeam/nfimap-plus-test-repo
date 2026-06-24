export interface SeatConfig {
  level: "floor" | "2f";
  block: "front" | "back";
  row: number; // 0-indexed row number (A = 0, B = 1, etc.)
}

export function getBaseScore(seat: SeatConfig, numRows: number): number {
  // Retained legacy interface just in case of any internal dependencies
  return 0;
}

export function getInterparkSeatScore(sectionId: string, rowName: string): number {
  const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
  const rowIndex = rowNamesList.indexOf(rowName);
  const row = rowIndex !== -1 ? rowIndex : 0;

  if (sectionId === "F1" || sectionId === "F2") {
    return 100 - row; // Rows A-T map to 100 down to 81
  } else if (sectionId === "F3" || sectionId === "F4") {
    return 80 - row;  // Rows A-T map to 80 down to 61
  } else if (sectionId.startsWith("1")) {
    return 60 - row;  // Rows A-P map to 60 down to 45
  } else if (sectionId.startsWith("2")) {
    return 44 - row;  // Rows A-P map to 44 down to 29
  }

  return 10;
}

export function getTicketlinkSeatScore(sectionName: string, rowName: string): number {
  const rowNamesList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X"];
  const rowIndex = rowNamesList.indexOf(rowName);
  const row = rowIndex !== -1 ? rowIndex : 0;

  if (sectionName === "가" || sectionName === "나") {
    return 100 - row; // Rows A-N map to 100 down to 87
  } else if (sectionName === "다" || sectionName === "라" || sectionName === "마") {
    return 86 - row;  // Rows A-L map to 86 down to 75
  } else if (sectionName === "바" || sectionName === "아") {
    return 74 - row;  // Rows A-X map to 74 down to 51
  } else if (sectionName === "사") {
    return 50 - row;  // Rows A-H map to 50 down to 43
  }

  return 10;
}

export function getFinalScore(baseScore: number, responseTime: number): number {
  const rTime = Math.max(0, responseTime);
  return Math.round(Math.max(0, 100 - rTime) * baseScore);
}

