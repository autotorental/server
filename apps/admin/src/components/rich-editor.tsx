import { useEffect, useRef, useState } from "react"
import { Button } from "@medusajs/ui"
import { API } from "../lib/api"

/**
 * Lightweight WYSIWYG editor (WordPress-style) with zero external deps.
 * Uses contentEditable + document.execCommand. Outputs HTML via onChange.
 * Includes a Visual/HTML toggle so power users can still edit raw HTML.
 */

const STYLE_ID = "rte-styles"
function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return
  const s = document.createElement("style")
  s.id = STYLE_ID
  s.textContent = `
  /* Container — hard width cap & overflow guard so nothing inside can break layout */
  .rte-content {
    outline: none; line-height: 1.65; font-size: 15px;
    max-width: 100%; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word;
  }
  .rte-content:empty:before { content: attr(data-ph); color: var(--fg-muted, #9ca3af); }
  .rte-content h1 { font-size: 1.6rem; font-weight: 800; margin: .7em 0 .35em; }
  .rte-content h2 { font-size: 1.3rem; font-weight: 700; margin: .65em 0 .3em; }
  .rte-content h3 { font-size: 1.1rem; font-weight: 600; margin: .55em 0 .25em; }
  .rte-content p { margin: .45em 0; }
  .rte-content ul, .rte-content ol { padding-inline-start: 1.5em; margin: .45em 0; }
  .rte-content ul { list-style: disc; }
  .rte-content ol { list-style: decimal; }
  .rte-content blockquote { border-inline-start: 3px solid #d4d4d8; padding-inline-start: .85em; color: #6b7280; margin: .55em 0; font-style: italic; }
  .rte-content a { color: #2563eb; text-decoration: underline; }
  /* IMAGES — bullet-proof: !important + explicit cap + auto-height. Overrides
     any inline width="2400" or style="width:..." that browsers/AI might insert. */
  .rte-content img {
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    max-height: 420px !important;
    object-fit: contain !important;
    border-radius: 10px;
    margin: .5em auto;
    display: block;
  }
  .rte-content figure { margin: .6em 0; max-width: 100%; }
  .rte-content figure img { width: 100% !important; }
  .rte-content video, .rte-content iframe { max-width: 100% !important; width: 100% !important; height: auto; }
  .rte-content table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .rte-content td, .rte-content th { border: 1px solid #e5e7eb; padding: 6px 10px; word-break: break-word; }
  .rte-content pre { max-width: 100%; overflow-x: auto; white-space: pre-wrap; }
  `
  document.head.appendChild(s)
}

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  dir?: "ltr" | "rtl"
  allowImages?: boolean
}

const Tool = ({ label, title, onClick }: { label: React.ReactNode; title: string; onClick: () => void }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick() }}
    className="h-8 min-w-8 px-2 rounded-md text-sm font-medium text-ui-fg-base bg-ui-bg-base hover:bg-ui-bg-base-hover border border-ui-border-base transition"
  >
    {label}
  </button>
)

export default function RichEditor({ value, onChange, placeholder, minHeight = 280, dir = "ltr", allowImages = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<"visual" | "html">("visual")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { ensureStyles() }, [])

  // Sync external value into the editor without clobbering the caret while typing.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML !== (value || "")) el.innerHTML = value || ""
  }, [value, mode])

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
  }
  const block = (tag: string) => exec("formatBlock", tag)

  const link = () => {
    const url = prompt("Link URL (https://...)")
    if (url) exec("createLink", url.trim())
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) {
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")
        exec("insertHTML", `<figure><img src="${url}" alt="${alt}" /></figure><p><br/></p>`)
      }
    } finally { setUploading(false) }
  }

  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-ui-border-base bg-ui-bg-subtle px-2 py-1.5">
        <Tool label={<b>B</b>} title="Bold" onClick={() => exec("bold")} />
        <Tool label={<i>I</i>} title="Italic" onClick={() => exec("italic")} />
        <Tool label={<u>U</u>} title="Underline" onClick={() => exec("underline")} />
        <span className="mx-1 h-5 w-px bg-ui-border-base" />
        <Tool label="H2" title="Heading 2" onClick={() => block("h2")} />
        <Tool label="H3" title="Heading 3" onClick={() => block("h3")} />
        <Tool label="¶" title="Paragraph" onClick={() => block("p")} />
        <span className="mx-1 h-5 w-px bg-ui-border-base" />
        <Tool label="• List" title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <Tool label="1. List" title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <Tool label="❝" title="Quote" onClick={() => block("blockquote")} />
        <Tool label="🔗" title="Insert link" onClick={link} />
        {allowImages && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            <Tool label={uploading ? "…" : "🖼 Image"} title="Upload image" onClick={() => fileRef.current?.click()} />
          </>
        )}
        <Tool label="⌫ Clear" title="Clear formatting" onClick={() => exec("removeFormat")} />
        <div className="ml-auto">
          <Button
            type="button"
            size="small"
            variant="transparent"
            onClick={() => {
              if (mode === "html" && ref.current) onChange(ref.current.innerHTML)
              setMode((m) => (m === "visual" ? "html" : "visual"))
            }}
          >
            {mode === "visual" ? "</> HTML" : "👁 Visual"}
          </Button>
        </div>
      </div>

      {mode === "visual" ? (
        <div
          ref={ref}
          className="rte-content px-4 py-3 text-ui-fg-base"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          data-ph={placeholder || "Start writing…"}
          onInput={() => ref.current && onChange(ref.current.innerHTML)}
          onBlur={() => ref.current && onChange(ref.current.innerHTML)}
        />
      ) : (
        <textarea
          className="w-full px-4 py-3 font-mono text-sm bg-ui-bg-base text-ui-fg-base outline-none"
          style={{ minHeight }}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
