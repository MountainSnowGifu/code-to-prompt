import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { usePromptTemplates } from "../hooks/usePromptTemplates";
import type { PromptTemplate } from "../types/prompt";

const NEW_TEMPLATE_ID = "__new__";

export function PromptTemplatesPanel() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, resetToDefault } =
    usePromptTemplates();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [undoDelete, setUndoDelete] = useState<PromptTemplate | null>(null);

  function startEdit(t: PromptTemplate) {
    setEditingId(t.id);
    setDraft({ title: t.title, body: t.body });
  }

  function saveEdit() {
    if (!editingId) return;
    if (editingId === NEW_TEMPLATE_ID) {
      addTemplate(draft);
    } else {
      updateTemplate(editingId, draft);
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleAdd() {
    setEditingId(NEW_TEMPLATE_ID);
    setDraft({ title: "New template", body: "" });
  }

  function handleDelete(t: PromptTemplate) {
    setUndoDelete(t);
    deleteTemplate(t.id);
  }

  function handleUndoDelete() {
    if (!undoDelete) return;
    addTemplate({ title: undoDelete.title, body: undoDelete.body });
    setUndoDelete(null);
  }

  async function handleCopy(t: PromptTemplate) {
    await navigator.clipboard.writeText(t.body);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}
        >
          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
            $ templates
          </Typography>
          <Stack direction="row" spacing={1}>
            {confirmReset ? (
              <>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  onClick={() => {
                    resetToDefault();
                    setConfirmReset(false);
                    setEditingId(null);
                  }}
                >
                  Confirm reset
                </Button>
                <Button size="small" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="small" color="inherit" onClick={() => setConfirmReset(true)}>
                Reset
              </Button>
            )}
            <Button size="small" variant="outlined" onClick={handleAdd}>
              + Add
            </Button>
          </Stack>
        </Stack>
        <Divider />

        <Stack divider={<Divider />}>
          {editingId === NEW_TEMPLATE_ID && (
            <EditCard
              draft={draft}
              onChange={setDraft}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          )}
          {templates.map((t) =>
            editingId === t.id ? (
              <EditCard
                key={t.id}
                draft={draft}
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            ) : (
              <ViewCard
                key={t.id}
                template={t}
                copied={copiedId === t.id}
                onCopy={() => handleCopy(t)}
                onEdit={() => startEdit(t)}
                onDelete={() => handleDelete(t)}
              />
            ),
          )}
        </Stack>
      </Paper>

      <Snackbar
        open={undoDelete !== null}
        autoHideDuration={4000}
        onClose={(_, reason) => { if (reason !== "clickaway") setUndoDelete(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          action={
            <Button color="inherit" size="small" onClick={handleUndoDelete}>
              Undo
            </Button>
          }
          onClose={() => setUndoDelete(null)}
        >
          Template deleted
        </Alert>
      </Snackbar>
    </>
  );
}

type ViewCardProps = {
  template: PromptTemplate;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function ViewCard({ template, copied, onCopy, onEdit, onDelete }: ViewCardProps) {
  return (
    <Box sx={{ px: 2, py: 1.5, "&:hover": { bgcolor: "rgba(57, 255, 136, 0.06)" } }}>
      <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.25 }}>
            {template.title}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              whiteSpace: "pre-wrap",
            }}
          >
            {template.body}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant={copied ? "contained" : "outlined"}
            color={copied ? "success" : "primary"}
            onClick={onCopy}
            sx={{ minWidth: 72, fontSize: "0.75rem" }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

type EditCardProps = {
  draft: { title: string; body: string };
  onChange: (draft: { title: string; body: string }) => void;
  onSave: () => void;
  onCancel: () => void;
};

function EditCard({ draft, onChange, onSave, onCancel }: EditCardProps) {
  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: "rgba(57, 255, 136, 0.04)" }}>
      <Stack spacing={1.5}>
        <TextField
          label="Title"
          size="small"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          fullWidth
          autoFocus
        />
        <TextField
          label="Template body"
          size="small"
          value={draft.body}
          onChange={(e) => onChange({ ...draft, body: e.target.value })}
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (draft.title.trim()) onSave();
            }
          }}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button size="small" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={onSave} disabled={!draft.title.trim()}>
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}
