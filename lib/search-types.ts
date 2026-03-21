export type SearchUserResult = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  postCount: number;
  commentCount: number;
};

export type SearchCommunityResult = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string;
  color: string;
  memberCount: number;
  postCount: number;
};

export type SearchPostResult = {
  id: string;
  publicId: string;
  title: string;
  body: string | null;
  url: string | null;
  score: number;
  commentCount: number;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  community: {
    name: string;
    displayName: string;
    icon: string;
    color: string;
  };
};

export type SearchResults = {
  users: SearchUserResult[];
  communities: SearchCommunityResult[];
  posts: SearchPostResult[];
};

export type SearchSuggestionResponse = {
  users: Array<Pick<SearchUserResult, "id" | "username" | "displayName">>;
  communities: Array<
    Pick<SearchCommunityResult, "id" | "name" | "displayName" | "icon" | "color">
  >;
  posts: Array<
    Pick<SearchPostResult, "id" | "publicId" | "title"> & {
      author: Pick<SearchPostResult["author"], "username" | "displayName">;
      community: Pick<
        SearchPostResult["community"],
        "name" | "displayName" | "icon" | "color"
      >;
    }
  >;
};
