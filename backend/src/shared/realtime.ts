import { getIO } from "../realtime/socket.js";

export const emitRealtime = (room: string, event: string, payload: unknown) => {
  getIO().to(room).emit(event, payload ?? {});
};
