// @ts-check

export const name = "1edtech/comments";

/**
 * Remove all comment nodes.
 */
export async function run() {
  const nodeIterator = document.createNodeIterator(
    document.documentElement,
    NodeFilter.SHOW_COMMENT
  );
  const comments = [];
  let currentNode;

  while ((currentNode = nodeIterator.nextNode())) {
    comments.push(currentNode);
  }

  comments.forEach(comment => {
    comment.parentElement.removeChild(comment);
  });
}
