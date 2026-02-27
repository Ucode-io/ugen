export const MOCK_PROJECTS = [
  {
    id: 1,
    name: "Simple Site Creator",
    editedAt: "Edited 22 hours ago",
    createdAt: "22 hours ago",
    author: {
      name: "Nurmuhammad Mahmudov",
      initials: "NM"
    },
    image: null,
  },
  {
    id: 2,
    name: "Heartfelt Creations",
    editedAt: "Edited 3 days ago",
    createdAt: "3 days ago",
    author: {
      name: "Nurmuhammad Mahmudov",
      initials: "NM"
    },
    image: null,
  },
  {
    id: 3,
    name: "Remix of Ai Video Studio Landing Page",
    editedAt: "Edited 3 days ago",
    createdAt: "3 days ago",
    author: {
      name: "Nurmuhammad Mahmudov",
      initials: "NM"
    },
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2800&auto=format&fit=crop", // placeholder
  }
];

export type Project = typeof MOCK_PROJECTS[0];
