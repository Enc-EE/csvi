// @ts-check

(function () {

	// @ts-ignore
	const vscode = acquireVsCodeApi();

	const mainContainer = /** @type {HTMLElement} */ (document.getElementById('main'));

	let focusedX = 0;
	let focusedY = 0;
	let numberOfColumns = 0;
	let numberOfRows = 0;
	let isEditMode = false;

	document.addEventListener('keydown', (e) => {
		if (!e.altKey && !e.shiftKey && !e.ctrlKey) {
			var newX = focusedX;
			var newY = focusedY;
			if (!isEditMode) {
				if (e.key.length === 1 && 'abcdefghijklmnopqrstuvwxyz0123456789äöü'.indexOf(e.key) >= 0) {
					openEditor(true);
				}
				switch (e.key) {
					case 'ArrowUp':
						// closeEditor(true);
						newY = Math.max(0, newY - 1);
						break;
					case 'ArrowDown':
						// closeEditor(true);
						newY = Math.min(numberOfRows - 1, newY + 1);
						break;
					case 'ArrowLeft':
						// closeEditor(true);
						newX = Math.max(0, newX - 1);
						break;
					case 'ArrowRight':
						// closeEditor(true);
						newX = Math.min(numberOfColumns - 1, newX + 1);
						break;
					case 'Escape':
						closeEditor(false);
						break;
					case 'Enter':
						closeEditor(true);
						break;
					case 'F2':
						openEditor(false);
						break;
					default:
						break;
				}
			} else {
				switch (e.key) {
					case 'Escape':
						closeEditor(false);
						break;
					case 'Enter':
						closeEditor(true);
						break;
					default:
						break;
				}
			}
			alert(newX + "#" + newY);
			focusCell(newX, newY);
		}
	});

	function openEditor(/** @type {Boolean} */ reset) {
		if (!isEditMode) {
			isEditMode = true;
			let focusedCell = document.getElementById('cell-' + focusedX + '-' + focusedY);
			let cellValueContainer = focusedCell.children[0];
			cellValueContainer.classList.add('hide');

			const cellEditor = document.createElement('input');
			cellEditor.id = 'cell-editor';
			cellEditor.type = 'text';
			if (!reset) {
				cellEditor.value = cellValueContainer.textContent;
			}
			focusedCell.appendChild(cellEditor);
			cellEditor.focus();
			cellEditor.addEventListener('focusout', () => {
				if (isEditMode) {
					closeEditor(false);
				}
			});
		}
	}

	function closeEditor(/** @type {Boolean} */ save) {
		if (isEditMode) {
			isEditMode = false;
			let focusedCell = document.getElementById('cell-' + focusedX + '-' + focusedY);
			let cellValueContainer = focusedCell.children[0];
			cellValueContainer.classList.remove('hide');
			let cellEditor = /** @type {HTMLInputElement} */ (document.getElementById('cell-editor'));
			focusedCell.removeChild(cellEditor);
			if (save && cellValueContainer.textContent !== cellEditor.value) {
				cellValueContainer.textContent = cellEditor.value;
				vscode.postMessage({ type: 'update', rowIndex: focusedY, columnIndex: focusedX, value: cellEditor.value });
			}
		}
	}

	// const errorContainer = document.createElement('div');
	// document.body.appendChild(errorContainer);
	// errorContainer.className = 'error'
	// errorContainer.style.display = 'none'

	const tableContainer = document.createElement('table');
	mainContainer.appendChild(tableContainer);

	function updateContent(/** @type {string[][]} */ data) {
		tableContainer.innerHTML = '';
		if (data.length > 0 && data[0].length > 0) {
			numberOfRows = data.length;
			numberOfColumns = data[0].length;

			for (let i = -1; i < numberOfRows; i++) {
				const trContainer = document.createElement('tr');

				if (i === -1) {
					for (let j = -1; j < numberOfColumns; j++) {
						const columnContainer = document.createElement('th');
						if (j >= 0) {
							columnContainer.textContent = getColumnName(j);
						}

						trContainer.appendChild(columnContainer);
					}
				} else {
					const line = data[i];

					for (let j = -1; j < numberOfColumns; j++) {
						const columnContainer = document.createElement(j === -1 ? 'th' : 'td');

						if (j === -1) {
							if (i >= 0) {
								columnContainer.textContent = (i + 1).toString();
							}
						} else {
							const cell = line[j];

							columnContainer.id = 'cell-' + j + '-' + i;
							columnContainer.addEventListener('click', () => {
								focusCell(j, i);
							});
							columnContainer.addEventListener('dblclick', () => {
								focusCell(j, i);
								openEditor(false);
							});

							const cellValueContainer = document.createElement('div');

							// } else {
							// 	// const cellEditor = document.createElement('input');
							// 	// cellEditor.type = 'text';
							// 	// cellEditor.value = cell;
							// 	// cellEditor.addEventListener('input', (e) => vscode.postMessage({ type: 'update', rowIndex: i, colIndex: j, value: cellEditor.value }));
							// 	// columnContainer.appendChild(cellEditor);
							// }
							cellValueContainer.textContent = cell;
							columnContainer.appendChild(cellValueContainer);
						}

						trContainer.appendChild(columnContainer);
					}
				}

				tableContainer.appendChild(trContainer);
			}
		}

		focusCell(focusedX, focusedY);

		// let json;
		// try {
		// 	if (!text) {
		// 		text = '{}';
		// 	}
		// 	json = JSON.parse(text);
		// } catch {
		// 	notesContainer.style.display = 'none';
		// 	errorContainer.innerText = 'Error: Document is not valid json';
		// 	errorContainer.style.display = '';
		// 	return;
		// }
		// notesContainer.style.display = '';
		// errorContainer.style.display = 'none';

		// // Render the scratches
		// notesContainer.innerHTML = '';
		// for (const note of json.scratches || []) {
		// 	const element = document.createElement('div');
		// 	element.className = 'note';
		// 	notesContainer.appendChild(element);

		// 	const text = document.createElement('div');
		// 	text.className = 'text';
		// 	const textContent = document.createElement('span');
		// 	textContent.innerText = note.text;
		// 	text.appendChild(textContent);
		// 	element.appendChild(text);

		// 	const created = document.createElement('div');
		// 	created.className = 'created';
		// 	created.innerText = new Date(note.created).toUTCString();
		// 	element.appendChild(created);

		// 	const deleteButton = document.createElement('button');
		// 	deleteButton.className = 'delete-button';
		// 	deleteButton.addEventListener('click', () => {
		// 		vscode.postMessage({ type: 'delete', id: note.id, });
		// 	});
		// 	element.appendChild(deleteButton);
		// }

		// notesContainer.appendChild(addButtonContainer);

	}

	function getColumnName(colIndex) {
		const letters = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ';
		const nextLetters = Math.floor(colIndex / letters.length);
		if (nextLetters > 0) {
			return getColumnName(nextLetters - 1) + letters[colIndex % letters.length];
		} else {
			return letters[colIndex % letters.length];
		}
	}

	function focusCell(newX, newY) {
		// if (focusedX !== newX || focusedY !== newY) {
		document.getElementById('cell-' + focusedX + '-' + focusedY).classList.remove('focused');
		focusedX = newX;
		focusedY = newY;
		document.getElementById('cell-' + focusedX + '-' + focusedY).classList.add('focused');
		// }
	}

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', event => {
		const message = event.data; // The json data that the extension sent
		switch (message.type) {
			case 'update':
				const data = message.data;

				// Update our webview's content
				updateContent(data);

				// Then persist state information.
				// This state is returned in the call to `vscode.getState` below when a webview is reloaded.
				vscode.setState({ data });

				return;
		}
	});

	// Webviews are normally torn down when not visible and re-created when they become visible again.
	// State lets us save information across these re-loads
	const state = vscode.getState();
	if (state) {
		updateContent(state.data);
	}

	hookUpButtons();

	function hookUpButtons() {
		document.getElementById('addColumnBeforeBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'addColumn',
				columnIndex: focusedX,
				isBefore: true,
			});
		});
		document.getElementById('addColumnBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'addColumn',
				columnIndex: focusedX,
				isBefore: false,
			});
		});
		document.getElementById('deleteColumnBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'deleteColumn',
				columnIndex: focusedX,
			});
		});

		document.getElementById('addRowBeforeBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'addRow',
				rowIndex: focusedY,
				isBefore: true,
			});
		});
		document.getElementById('addRowBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'addRow',
				rowIndex: focusedY,
				isBefore: false,
			});
		});
		document.getElementById('deleteRowBtn').addEventListener('click', () => {
			vscode.postMessage({
				type: 'deleteRow',
				rowIndex: focusedY,
			});
		});
	}
}());
