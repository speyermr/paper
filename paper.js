// vim: sw=2:ts=2:et

const DOTS = '..........'.repeat(500);

function add_header_marks() {
  let mark = document.querySelector('header mark');
  if (!mark) return;

  let total = 0;
  document.querySelectorAll('section mark').forEach(el => {
    let n = parseInt(el.innerText);
    total += n;
  });

  let el = document.createTextNode(total + ' marks');
  mark.prepend(el);
}

function add_labels() {
  document.querySelectorAll('section').forEach(el => {
    if (el.querySelector('label')) return;
    let label = document.createElement('label');
    el.prepend(label);
  });
}

function fill_textareas() {
  let nodes = document.querySelectorAll('textarea');
  nodes.forEach(el => {
    let dots = document.createTextNode(DOTS);
    el.append(dots);
  });
}

function readonly_textareas() {
  document.querySelectorAll('textarea').forEach(el => {
    el.setAttribute('readonly', '');
  });
}

function tag_questions() {
  /* Top-level sections start on new pages */
  /*
  document.querySelectorAll('body > section').forEach((el, index) => {
    // Don't start the first question on a new page
    if (index == 0) return
    let breaker = document.createElement('div');
    breaker.classList.add('breaker');
    el.parentNode.insertBefore(breaker, el);
  });
  */

  document.querySelectorAll('mark').forEach(el => {
    el.parentNode.classList.add('question-part');
  });
}

function add_details_summary() {
  document.querySelectorAll('details').forEach(el => {
    if (el.querySelector('summary')) return;

    let summary = document.createElement('summary');
    summary.innerText = 'Answer';
    el.prepend(summary);
  });
}

function answers() {
  document.querySelectorAll('details').forEach(el => {
    el.setAttribute('open', '');
  });
}

function lint() {
  // Find leaf <section> elements without marks
  document.querySelectorAll('section').forEach(section => {
    if (section.querySelector('section')) return;

    let marks = section.querySelectorAll('mark');
    if (marks.length == 1) return;

    let error = document.createElement('div');

    if (marks.length == 0) {
      error.innerText = 'No <mark> elements!';
    } else {
      error.innerText = 'More than 1 <mark> elements!';
    }

    let icon = document.createElement('div');
    icon.setAttribute('class', 'error');
    icon.append(error);
    section.append(icon);
  });
}

function add_keyboard_shortcuts() {
  document.addEventListener('keypress', e => {
    if (e.code == KeyL) toggle_linting;
  });
}

function format_code_blocks() {
  document.querySelectorAll('code[indented]').forEach(el => {
    let code = el.innerText;

    /* HTML expects code to look like:
     *
     *   <code>LINE\nLINE</code>
     *
     * but if it's indented it will look like:
     *
     *   <code>\n     CODE\n    </code>
     *
     */
    code = code.replace(/^\n/, '').replace(/\n *$/, '');
    let g = code.match(/^(\s+)/);
    if (g) {
      let indent = g[1];
      let lines = code.split("\n");
      let replacement = [];
      lines.forEach(line => {
        line = line.replace(indent, '');
        replacement.push(line);
      });
      code = replacement.join("\n");
    }
    el.innerText = code;
  });

  document.querySelectorAll('code[numbered]').forEach(el => {
    let num_lines = el.innerText.split("\n").length;

    let t = ''
    for (let i = 0; i < num_lines; i++) {
      let ln = i + 1;
      if (ln < 10) t += '0';
      t += ln + "\n";
    }

    let line_numbers = document.createElement('span');
    line_numbers.classList.add('line-numbers');
    line_numbers.innerHTML = t;

    el.append(line_numbers);
  });
}

// TODO document this, it's useful for drawing.
function svgCreateElement(name, attributes) {
  const ns = "http://www.w3.org/2000/svg"
  let el = document.createElementNS(ns, name);
  for (let k in attributes) {
    let v = attributes[k];
    el.setAttribute(k, v);
  }
  return el;
}

function complete() {
  add_header_marks();
  add_labels();
  fill_textareas();
  readonly_textareas();
  tag_questions();
  add_details_summary();
  lint();
  add_keyboard_shortcuts();

  // Add checkboxes
  document.querySelectorAll("ol[type='checkbox'] li").forEach(li => {
    let box = document.createElement('input');
    box.setAttribute('type', 'checkbox');
    box.setAttribute('onclick', 'return false;');
    //if (li.attributes['checked']) box.setAttribute('checked', '');
    let label = document.createElement('label');
    li.prepend(box, label);
  });

  format_code_blocks();
  annotate_question_numbers();
  build_mark_sheet();
}

function lower_roman(n) {
  const symbols = ['i', 'iv', 'v', 'ix', 'x'];
  const values = [1, 4, 5, 9, 10];
  let i = 4;
  let buf = '';
  while (n) {
    let val = values[i];
    buf += symbols[i].repeat(Math.floor(n/val));
    n %= val;
    i--;
  }
  return buf;
}

function annotate_question_numbers() {
  let counters = [0, null, null];
  let lower_alpha = n => String.fromCharCode(n + 96);

  function walk(node, depth) {
    if (node.tagName == 'SECTION') {
      // counter-increment
      counters[depth]++;

      // counter-reset
      for (let i = depth + 1; i < 3; i++) counters[i] = null;

      // annotate
      let id = '' + counters[0];
      if (counters[1]) id += '.' + lower_alpha(counters[0]);
      if (counters[2]) id += '.' + lower_roman(counters[2]);
      node.setAttribute('data-question-id', id);

      // recurse
      depth++;
    }
    node.childNodes.forEach(child => walk(child, depth));
  }

  walk(document.body, 0);
}

function build_mark_sheet() {
  let empty = () => Array.from({length:100}).map(x => null);
  let rows = Array.from({length:50}).map(x => empty());

  rows[3][0] = 'MAX';

  let qqs = [];
  document.querySelectorAll('.question-part').forEach((q, ii) => {
    let x = ii + 1;
    let id = q.attributes['data-question-id'].value;
    let vs = id.split('.');
    vs.forEach((v, y) => {
      rows[y][x] = v;
    });

    let mark = q.querySelector('mark').innerText;
    rows[3][x] = mark;
  });

  let csv = rows.map(row => row.join(',')).join("\n");

  let dl = document.createElement('a');
  let data = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  dl.setAttribute('href', data);
  dl.setAttribute('download', 'marks.csv');
  dl.innerText = 'marks.csv';
  document.body.append(dl);
  //dl.click();
}

window.onload = complete;
