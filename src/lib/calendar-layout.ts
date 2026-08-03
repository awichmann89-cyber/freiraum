export type Positioned<T> = T & { col: number; colCount: number };

/**
 * Klassisches Intervall-Clustering für überlappende Kalender-Events einer Spalte:
 * Events werden gierig auf Unterspalten verteilt; alle Events eines
 * Überlappungs-Clusters teilen sich dieselbe Spaltenanzahl.
 */
export function layoutOverlaps<T extends { startMin: number; endMin: number }>(
  events: T[]
): Positioned<T>[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let columnEnds: number[] = []; // Ende des letzten Events je Unterspalte
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    const colCount = columnEnds.length;
    for (const ev of cluster) ev.colCount = colCount;
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.startMin >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }

    let col = columnEnds.findIndex((end) => end <= ev.startMin);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(ev.endMin);
    } else {
      columnEnds[col] = ev.endMin;
    }

    cluster.push({ ...ev, col, colCount: 1 });
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  flushCluster();

  return result;
}
