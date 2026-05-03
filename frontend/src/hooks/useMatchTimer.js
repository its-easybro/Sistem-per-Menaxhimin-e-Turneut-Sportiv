import { useEffect, useState } from "react";

function getMatchStartTime(match){
    if(!match?.data_ndeshjes){
        return null;
    }

    const datePart = String(match.data_ndeshjes).slice(0, 10);
    const timePart = match.ora_fillimit
        ? String(match.ora_fillimit).slice(11, 19) || String(match.ora_fillimit)
        : "00:00:00";

    return new Date(`${datePart}T${timePart}`);
}

export function useMatchTimer(match) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if(match?.statusi !== "Live"){
            setElapsedSeconds(0);
            return;
        }

        const startTime = getMatchStartTime(match);

        if(!startTime || Number.isNaN(startTime.getTime())){
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            const nextElapsed = Math.max(
                0,
                Math.floor((Date.now() - startTime.getTime()) / 1000),
            );

            setElapsedSeconds(nextElapsed);
        };

        updateElapsed();

        const intervalId = setInterval(updateElapsed, 1000);

        return () => clearInterval(intervalId);
    }, [match?.statusi, match?.data_ndeshjes, match?.ora_fillimit]);

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    const display =
        match?.statusi === "Live"
            ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            : "--:--";

    const isFinished = 
        typeof match?.kohezgjatja === "number" && minutes >= match.kohezgjatja;

    return {
        display,
        minutes,
        seconds,
        isFinished,
    };

}