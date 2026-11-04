export const instant = false;

export default function NotFound() {
  return (
    <div className='flex h-full flex-col items-center justify-center p-8 text-center'>
      <h1 className='text-base font-semibold'>Not found</h1>
      <p className='mt-1 text-xs text-fg-muted'>The requested page does not exist.</p>
    </div>
  );
}
