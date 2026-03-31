import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-primary/5 rounded-lg", className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-primary/5 space-y-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-32 h-8" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="lg:col-span-2 h-[400px] rounded-[32px]" />
        <Skeleton className="h-[400px] rounded-[32px]" />
      </div>
    </div>
  );
}

export function PatientListSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-3" />
        </div>
        <Skeleton className="w-32 h-12 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="w-32 h-5" />
            <div className="space-y-4">
              {[1, 2, 3].map(j => (
                <div key={j} className="bg-white p-4 rounded-2xl border border-primary/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-16 h-3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-full h-2" />
                    <Skeleton className="w-2/3 h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-48 h-8" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-primary/5 flex items-center gap-8">
            <Skeleton className="w-24 h-24 rounded-[32px]" />
            <div className="space-y-4 flex-1">
              <Skeleton className="w-64 h-10" />
              <div className="flex gap-4">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="w-32 h-10 rounded-xl" />
            <Skeleton className="w-32 h-10 rounded-xl" />
            <Skeleton className="w-32 h-10 rounded-xl" />
          </div>
          <Skeleton className="w-full h-[400px] rounded-[40px]" />
        </div>
        <div className="space-y-8">
          <Skeleton className="w-full h-64 rounded-[40px]" />
          <Skeleton className="w-full h-64 rounded-[40px]" />
        </div>
      </div>
    </div>
  );
}
