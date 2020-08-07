/**
 * Subeader component.
 * @constructor
 * @param {Object} props
 * @param {String} props.currentPage - The current view being rendered.
 */

const subheader = props => ({
  posts: `
    <ul class="subheader">
      <li><a href="/posts">List</a></li>
      <li><a href="/help/posts">Help</a></li>
    </ul>
  `,
  artists: `
    <ul class="subheader">
      <li><a href="">List</a></li>
    </ul>
  `,
  import: `
    <ul class="subheader">
      <li><a href="">List</a></li>
    </ul>
  `,
  help: `
    <ul class="subheader">
      <li><a href="">List</a></li>
    </ul>
  `,
  board: `
    <ul class="subheader">
      <li><a href="/board">List</a></li>
      <li><a href="/board/new">New</a></li>
    </ul>
  `
})[props.currentPage];

module.exports = { subheader };