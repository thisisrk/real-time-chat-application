import React from "react";

export default function FindUsersSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-base-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-4">
            {/* Circular avatar */}
            <div className="w-14 h-14 bg-base-300 rounded-full"></div>

            {/* Name and username placeholders */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-base-300 rounded"></div>
              <div className="h-3 w-24 bg-base-300 rounded"></div>
            </div>
          </div>

          {/* Follow Button Placeholder */}
          <div className="h-10 w-24 bg-primary/20 rounded"></div>
        </div>
      ))}
    </div>
  );
}
