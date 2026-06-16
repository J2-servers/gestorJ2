import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colorMap = {
  blue: "text-blue-500",
  green: "text-green-500",
  orange: "text-orange-500",
  teal: "text-teal-500",
  red: "text-red-500"
};

export default function StatsCard({ title, value, icon: Icon, color = "blue", trend }) {
  const iconColorClass = colorMap[color] || colorMap.blue;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
        {trend && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}