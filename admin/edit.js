// admin/edit.js — compatibility shim for the retired ?edit=1 overlay.
//
// This module used to place uploads on the page by dragging them around and
// save pixel offsets against markup that no longer exists. Structured records
// replaced it, so the only thing left to do is send the owner to the editor
// that does write them, carrying which gallery page they came from.
//
// The generated pages no longer load this module. It stays because a cached or
// bookmarked page might still ask for it, and landing in the content editor is
// a better answer than a script error.

const page = location.pathname.split("/").pop() || "index.html";
const target = new URL("admin/content/", location.href);
target.searchParams.set("page", page);
location.replace(target);
