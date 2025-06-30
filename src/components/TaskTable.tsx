import React from 'react';

export interface Task {
  _id: string;
  orderId: string;
  type: string;
  assignedTo: string | { name?: string; email?: string; _id?: string };
  details: string;
  status: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskTableProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-pink-100 text-pink-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-purple-100 text-purple-700',
};

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, onStatusChange }) => (
  <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
    <h2 className="font-bold mb-2 text-lg">Tasks</h2>
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-2 py-1">Type</th>
          <th className="px-2 py-1">Assigned To</th>
          <th className="px-2 py-1">Details</th>
          <th className="px-2 py-1">Status</th>
          <th className="px-2 py-1">Deadline</th>
          <th className="px-2 py-1">Action</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task._id} className="border-b">
            <td className="px-2 py-1">{task.type}</td>
            <td className="px-2 py-1">
              {typeof task.assignedTo === 'object' && task.assignedTo !== null
                ? (task.assignedTo.name || task.assignedTo.email || task.assignedTo._id)
                : task.assignedTo}
            </td>
            <td className="px-2 py-1">{task.details}</td>
            <td className="px-2 py-1">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[task.status] || ''}`}>
                {task.status}
              </span>
            </td>
            <td className="px-2 py-1">{new Date(task.deadline).toLocaleDateString()}</td>
            <td className="px-2 py-1">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                className="input-field"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
