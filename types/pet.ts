export type Pet = {
  id: string;
  name: string;
  age: string;
  breed: string;
  race: string;
  imageUrl: string;
  vaccinated?: boolean;
  tags?: string[];
  description?: string;
  gender?: "Male" | "Female";
  size?: string;
  isFavorite?: boolean;
};

export const defaultPets: Pet[] = [
  {
    id: "1",
    name: "Luna",
    age: "2 years",
    breed: "Golden Retriever",
    race: "Dog",
    imageUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=80",
    vaccinated: true,
    tags: ["Friendly", "Playful", "Good with kids"],
    description: "Luna is a very energetic and friendly dog.",
    gender: "Female",
    size: "Small",
  },
  {
    id: "2",
    name: "Oliver",
    age: "1 year",
    breed: "Tabby",
    race: "Cat",
    imageUrl:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=500&q=80",
    vaccinated: true,
    tags: ["Curious", "Independent"],
    description: "Oliver loves to explore and cuddle when he's tired.",
    gender: "Male",
    size: "Medium",
  },
  {
    id: "3",
    name: "Cooper",
    age: "3 years",
    breed: "Beagle",
    race: "Dog",
    imageUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80",
    vaccinated: false,
    tags: ["Loyal", "Active"],
    description: "Cooper needs an active family to keep up with his energy.",
    gender: "Male",
    size: "Large",
  },
  {
    id: "4",
    name: "Bella",
    age: "4 months",
    breed: "Calico",
    race: "Cat",
    imageUrl:
      "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=500&q=80",
    vaccinated: true,
    tags: ["Sleepy", "Soft"],
    description: "Bella just loves to sleep all day.",
    gender: "Female",
    size: "Small",
  },
];
