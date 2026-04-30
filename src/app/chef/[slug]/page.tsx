export async function generateStaticParams() {
  return [];
}
export default function ChefPage({ params }) {
  return <div>{params.slug}</div>;
}