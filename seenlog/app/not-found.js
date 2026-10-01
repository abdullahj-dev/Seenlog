import Link from 'next/link';

export default function NotFound() {
  return (
    <section>
      <h2 className="rh d">Nothing here</h2>
      <p className="none">That page does not exist, or its owner made it private.</p>
      <Link href="/" className="btn g more">Back to my list</Link>
    </section>
  );
}
