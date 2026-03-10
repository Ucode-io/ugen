import React from 'react'

export const MediaSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl bg-white/5 animate-pulse border border-white/10 flex flex-col p-2 gap-2"
        >
          <div className="w-full h-full bg-white/5 rounded-lg" />
          <div className="h-4 w-3/4 bg-white/5 rounded mx-auto" />
          <div className="h-3 w-1/2 bg-white/5 rounded mx-auto" />
        </div>
      ))}
    </>
  )
}
