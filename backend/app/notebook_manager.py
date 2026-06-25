import json
import os
import shutil
from typing import Dict, Any, List
from app.config import WORKSPACE_DIR

def load_ipynb(file_path: str) -> List[Dict[str, Any]]:
    """
    Loads a standard Jupyter .ipynb file and converts it into 
    the list of cells expected by the frontend.
    """
    if os.path.isabs(file_path):
        abs_path = os.path.normpath(file_path)
    else:
        abs_path = os.path.normpath(os.path.join(WORKSPACE_DIR, file_path))
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Notebook file not found: {file_path}")

    with open(abs_path, 'r', encoding='utf-8') as f:
        nb_data = json.load(f)

    cells = []
    for idx, jupyter_cell in enumerate(nb_data.get("cells", [])):
        cell_type = jupyter_cell.get("cell_type", "code")
        source = jupyter_cell.get("source", [])
        content = "".join(source) if isinstance(source, list) else str(source)
        
        cell_id = jupyter_cell.get("metadata", {}).get("id", f"cell-{idx}-{os.urandom(4).hex()}")
        
        frontend_cell = {
            "id": cell_id,
            "type": cell_type,
            "content": content,
            "output": None,
            "executionCount": jupyter_cell.get("execution_count"),
            "isRunning": False,
            "collapsed": jupyter_cell.get("metadata", {}).get("collapsed", False)
        }

        # Parse Jupyter cell outputs
        if cell_type == "code" and "outputs" in jupyter_cell:
            jupyter_outputs = jupyter_cell.get("outputs", [])
            if jupyter_outputs:
                # Merge outputs into a single frontend-friendly output payload
                combined_content = []
                out_type = "text"
                
                for out in jupyter_outputs:
                    o_type = out.get("output_type")
                    
                    if o_type == "stream":
                        text = out.get("text", [])
                        text_str = "".join(text) if isinstance(text, list) else str(text)
                        combined_content.append(text_str)
                        if out.get("name") == "stderr":
                            out_type = "error"
                            
                    elif o_type in ("display_data", "execute_result"):
                        data = out.get("data", {})
                        if "image/png" in data:
                            png_data = data["image/png"].replace("\n", "")
                            combined_content.append(f"data:image/png;base64,{png_data}")
                            out_type = "text"
                        elif "text/html" in data:
                            html_str = "".join(data["text/html"]) if isinstance(data["text/html"], list) else str(data["text/html"])
                            combined_content.append(html_str)
                            out_type = "html"
                        elif "text/plain" in data:
                            plain_str = "".join(data["text/plain"]) if isinstance(data["text/plain"], list) else str(data["text/plain"])
                            combined_content.append(plain_str)
                            
                    elif o_type == "error":
                        tb = out.get("traceback", [])
                        tb_str = "\n".join(tb)
                        combined_content.append(tb_str)
                        out_type = "error"
                
                if combined_content:
                    frontend_cell["output"] = {
                        "type": out_type,
                        "content": "".join(combined_content)
                    }

        cells.append(frontend_cell)

    return cells

def save_ipynb(file_path: str, cells: List[Dict[str, Any]]):
    """
    Saves frontend cell list into standard Jupyter .ipynb file format.
    """
    if os.path.isabs(file_path):
        abs_path = os.path.normpath(file_path)
    else:
        abs_path = os.path.normpath(os.path.join(WORKSPACE_DIR, file_path))
    
    jupyter_cells = []
    for c in cells:
        c_type = c.get("type", "code")
        content = c.get("content", "")
        
        # Split source lines for Jupyter readability
        source_lines = [line + "\n" for line in content.split("\n")]
        if source_lines:
            source_lines[-1] = source_lines[-1].rstrip("\n")  # Strip last trailing empty line newline

        j_cell = {
            "cell_type": c_type,
            "metadata": {
                "id": c.get("id"),
                "collapsed": c.get("collapsed", False)
            },
            "source": source_lines
        }

        if c_type == "code":
            j_cell["execution_count"] = c.get("executionCount")
            j_cell["outputs"] = []
            
            output = c.get("output")
            if output:
                out_type = output.get("type")
                out_content = output.get("content", "")
                
                if out_type == "error":
                    j_cell["outputs"].append({
                        "output_type": "error",
                        "ename": "Exception",
                        "evalue": "Error during execution",
                        "traceback": out_content.split("\n")
                    })
                elif out_content.startswith("data:image/png;base64,"):
                    raw_base64 = out_content.replace("data:image/png;base64,", "")
                    j_cell["outputs"].append({
                        "output_type": "display_data",
                        "data": {
                            "image/png": raw_base64,
                            "text/plain": "[matplotlib figure]"
                        },
                        "metadata": {}
                    })
                elif out_type == "html":
                    j_cell["outputs"].append({
                        "output_type": "execute_result",
                        "data": {
                            "text/html": [line + "\n" for line in out_content.split("\n")],
                            "text/plain": "[HTML output]"
                        },
                        "metadata": {},
                        "execution_count": c.get("executionCount")
                    })
                else:
                    j_cell["outputs"].append({
                        "output_type": "stream",
                        "name": "stdout",
                        "text": [line + "\n" for line in out_content.split("\n")]
                    })
                    
        jupyter_cells.append(j_cell)

    notebook_json = {
        "cells": jupyter_cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {
                    "name": "ipython",
                    "version": 3
                },
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.11.7"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }

    # Ensure parent folders exist
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        json.dump(notebook_json, f, indent=2, ensure_ascii=False)

def export_to_py(ipynb_path: str, py_path: str):
    """Exports a notebook's code cells into a standalone .py python script."""
    cells = load_ipynb(ipynb_path)
    if os.path.isabs(py_path):
        abs_py_path = os.path.normpath(py_path)
    else:
        abs_py_path = os.path.normpath(os.path.join(WORKSPACE_DIR, py_path))
    
    py_lines = []
    for c in cells:
        if c["type"] == "code":
            py_lines.append(f"# %% [{c['id']}]\n{c['content']}\n\n")
        else:
            # Markdown comments
            md_comment = "\n".join(f"# {line}" for line in c['content'].split("\n"))
            py_lines.append(f"# %% [markdown]\n{md_comment}\n\n")

    os.makedirs(os.path.dirname(abs_py_path), exist_ok=True)
    with open(abs_py_path, 'w', encoding='utf-8') as f:
        f.write("".join(py_lines))
