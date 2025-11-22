type WsData = {
    roomId: string;
    playerId: string;
};

const server = Bun.serve<WsData>({
    port: 3000,
    fetch(req, server) {
        const url = new URL(req.url);

        const playerId = crypto.randomUUID();
        const success = server.upgrade(req, {
            data: { roomId: "", playerId },
        });
        return success ? undefined : new Response("WebSocket upgrade error", { status: 400 });
    },
    websocket: {
        open(ws) {
            console.log(`Client connected: ${ws.data.playerId}`);
        },
        message(ws, message) {
            const data = JSON.parse(typeof message === "string" ? message : "");

            switch (data.type) {
                case "JOIN_ROOM":
                    const { roomId } = data.payload;
                    ws.data.roomId = roomId;
                    ws.subscribe(roomId);
                    ws.publish(roomId, JSON.stringify({ type: "PLAYER_JOINED", payload: { playerId: ws.data.playerId } }));
                    break;

                case "MAKE_MOVE":
                    ws.publish(ws.data.roomId, JSON.stringify({
                        type: "OPPONENT_MOVE",
                        payload: data.payload
                    }));
                    break;
            }
        },
        close(ws) {
            if (ws.data.roomId) {
                ws.unsubscribe(ws.data.roomId);
                server.publish(ws.data.roomId, JSON.stringify({ type: "PLAYER_LEFT" }));
            }
        },
    },
});

console.log(`Listening on ${server.port}`);