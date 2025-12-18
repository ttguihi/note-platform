import { useOthersConnectionIds } from "@/liveblocks.config";
import { Cursor } from "./cursor";

export function LiveCursors() {
    const ids = useOthersConnectionIds();

    return (
        <>
            {ids.map((connectionId) => (
                <Cursor key={connectionId} connectionId={connectionId} />
            ))}
        </>
    );
}