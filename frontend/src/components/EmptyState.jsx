export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-16">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-gray-600">{subtitle}</div>
      {action}
    </div>
  );
}
