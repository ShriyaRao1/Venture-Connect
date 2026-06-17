export default function Spinner({ size = 40, color = '#7c3aed' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
      <svg width={size} height={size} viewBox="0 0 50 50" style={{ animation: 'spin 0.8s linear infinite' }}>
        <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray="100 28" />
      </svg>
    </div>
  );
}
