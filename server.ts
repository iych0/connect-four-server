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
            console.log(`Client connected. Player: ${ws.data.playerId} | Room: ${ws.data.roomId}`);
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
        close(ws, code, reason) {
            if (ws.data.roomId) {
                ws.unsubscribe(ws.data.roomId);
                server.publish(ws.data.roomId, JSON.stringify({ type: "PLAYER_LEFT" }));
            }

            const type = code === 1000 ? 'Normal Close' : 'Abnormal Close/Error';
            console.log(
                `Connection closed. Player: ${ws.data.playerId} | Room: ${ws.data.roomId} | ${type}`,
                `Code: ${code} | Reason: ${reason || 'N/A'}`
            );

            if (code !== 1000 && code !== 1001) {
                console.error(`Unexpected closure: Code ${code}`);
            }
        },
    },
});

console.log(`Listening on ${server.port}`);