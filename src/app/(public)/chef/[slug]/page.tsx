export async function generateStaticParams() {
  return [];
}

export default function ChefPage({ params }: { params: { slug: string } }) {
  return <div>{params.slug}</div>;
}