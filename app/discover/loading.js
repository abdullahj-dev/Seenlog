export default function Loading() {
  return (
    <section>
      <h2 className="rh d">Discover<small>loading</small></h2>
      <div id="grid">{Array.from({ length: 12 }, (_, i) => <div className="card sk" key={i}><div className="poster" /></div>)}</div>
    </section>
  );
}
