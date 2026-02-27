interface PriceBarProps {
  low: number;
  mid: number;
  high: number;
}

export function PriceBar({ low, mid, high }: PriceBarProps) {
  const range = high - low;
  const midPosition = range > 0 ? ((mid - low) / range) * 100 : 50;

  return (
    <div className="relative mt-4 mb-2">
      <div className="h-3 bg-gradient-to-r from-green-400 via-blue-500 to-orange-400 rounded-full" />
      <div
        className="absolute top-0 -translate-x-1/2"
        style={{ left: `${midPosition}%` }}
      >
        <div className="w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow" />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>Budget</span>
        <span>Premium</span>
      </div>
    </div>
  );
}
