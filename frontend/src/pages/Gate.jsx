export default function Gate({ role }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="text-xl font-medium">Restricted</div>
      <div className="text-gray-600">
        This page is for the <span className="font-medium">{role}</span> role.  
        Use the role dropdown in the header to switch.
      </div>
    </div>
  );
}
