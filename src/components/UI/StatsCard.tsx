import React from 'react'
import { DivideIcon as LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'teal' | string
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-700',
  green: 'from-green-500 to-green-600 bg-green-50 text-green-700',
  yellow: 'from-yellow-500 to-yellow-600 bg-yellow-50 text-yellow-700',
  red: 'from-red-500 to-red-600 bg-red-50 text-red-700',
  purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-700',
  teal: 'from-teal-500 to-teal-600 bg-teal-50 text-teal-700',
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
}: StatsCardProps) {
  const changeColor =
    changeType === 'increase'
      ? 'text-green-600'
      : changeType === 'decrease'
      ? 'text-red-600'
      : 'text-gray-500'

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColor}`}>
              {changeType === 'increase' && '+'}
              {change}
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            colorClasses[color as keyof typeof colorClasses] 
              ? `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]} ${colorClasses[color as keyof typeof colorClasses].split(' ')[1]}`
              : ''
          }`}
          style={colorClasses[color as keyof typeof colorClasses] ? {} : {backgroundColor: color}}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}