import { GenerationResult, FlashcardItem, QuizQuestionItem } from "./types";

export const SAMPLE_FLASHCARDS: FlashcardItem[] = [
  {
    id: "fc-1",
    front: "What is the primary difference between Paging and Segmentation in OS?",
    back: "Paging divides memory into fixed-sized blocks called frames/pages, causing internal fragmentation. Segmentation divides memory into variable-sized logical units (functions, objects), which may cause external fragmentation.",
    category: "Operating Systems",
  },
  {
    id: "fc-2",
    front: "Explain the Concept of Translation Lookaside Buffer (TLB).",
    back: "TLB is a fast hardware associative cache that stores recent virtual-to-physical address translations. On a TLB hit, memory access takes ~1ns without needing multi-level page table lookups.",
    category: "Operating Systems",
  },
  {
    id: "fc-3",
    front: "What is Amdahl's Law and its mathematical formula?",
    back: "Amdahl's law models the theoretical speedup of latency with fixed workload: Speedup = 1 / ((1 - p) + (p / s)), where p is the proportion of parallel execution and s is the speedup factor.",
    category: "Computer Architecture",
  },
  {
    id: "fc-4",
    front: "Define ACID properties in Database Management Systems.",
    back: "Atomicity (all or nothing), Consistency (preserves invariants), Isolation (transactions execute independently), Durability (committed data survives crashes).",
    category: "DBMS",
  },
  {
    id: "fc-5",
    front: "What is the time complexity of searching in an AVL Tree vs a Splay Tree?",
    back: "AVL Tree guarantees strict O(log n) worst-case search. Splay Tree has O(log n) amortized time, but a single bad operation could take O(n).",
    category: "Data Structures",
  },
  {
    id: "fc-6",
    front: "How does the Attention Mechanism in Transformers compute attention weights?",
    back: "Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V, where queries and keys are projected and scaled by square root of key dimension to prevent vanishing gradients in softmax.",
    category: "Deep Learning",
  },
];

export const SAMPLE_QUIZZES: QuizQuestionItem[] = [
  {
    id: "q-1",
    question: "Which CPU scheduling algorithm can lead to the 'Convoy Effect'?",
    options: [
      "Shortest Job Next (SJN)",
      "Round Robin (RR)",
      "First-Come, First-Served (FCFS)",
      "Multi-Level Feedback Queue (MLFQ)",
    ],
    correctIndex: 2,
    explanation:
      "FCFS causes the Convoy Effect when a CPU-bound process holds the CPU for a long burst, causing all subsequent I/O-bound processes to wait needlessly in the ready queue.",
    topic: "Operating Systems",
  },
  {
    id: "q-2",
    question: "In computer memory hierarchy, which memory type provides the fastest access latency?",
    options: ["L1 Data/Instruction Cache", "CPU Registers", "L2 Unified Cache", "Main DRAM"],
    correctIndex: 1,
    explanation:
      "CPU registers operate directly inside the processor pipeline with sub-nanosecond (single clock cycle) access, faster even than L1 cache (typically 3-4 cycles).",
    topic: "Computer Architecture",
  },
  {
    id: "q-3",
    question: "What is the worst-case time complexity of QuickSort when using naive pivot selection?",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correctIndex: 2,
    explanation:
      "If the chosen pivot is always the maximum or minimum element (such as in an already sorted array with first element as pivot), QuickSort partitions degenerate into O(n²).",
    topic: "Algorithms",
  },
  {
    id: "q-4",
    question: "Which layer in the OSI 7-layer model is responsible for end-to-end flow control and reliable delivery?",
    options: ["Data Link Layer", "Network Layer", "Transport Layer", "Session Layer"],
    correctIndex: 2,
    explanation:
      "The Transport Layer (Layer 4, e.g. TCP) ensures reliable end-to-end data delivery, error recovery, segmentation, and flow control across hosts.",
    topic: "Computer Networks",
  },
  {
    id: "q-5",
    question: "In relational database design, BCNF (Boyce-Codd Normal Form) requires that:",
    options: [
      "Every non-prime attribute is fully dependent on the primary key",
      "For every functional dependency X -> Y, X must be a superkey",
      "There are no multi-valued dependencies",
      "All foreign keys reference clustered indexes",
    ],
    correctIndex: 1,
    explanation:
      "BCNF is a stricter version of 3NF. It states that for any non-trivial functional dependency X -> Y, the determinant X must be a superkey of the relation.",
    topic: "DBMS",
  },
];

export const INITIAL_GENERATION_SAMPLE: GenerationResult = {
  id: "sample-cornell-os",
  title: "Virtual Memory & Paging System Architecture",
  timestamp: new Date().toISOString(),
  mode: "learning",
  goal: "notes",
  summary:
    "Comprehensive Cornell Note breakdown covering virtual addresses, MMU hardware translation, multi-level page tables, TLB hits/misses, and page fault resolution.",
  content: `# Module: Memory Management Unit & Virtual Memory

## 1. Executive Summary & Core Objective
Virtual memory provides an abstraction of physical storage, allowing processes to execute without requiring contiguous memory or sufficient physical RAM. It enforces process isolation, security boundaries, and demand-driven resource allocation.

---

## 2. Cornell Method Breakdown

| Cues & Key Concepts | Comprehensive Detailed Notes |
| :--- | :--- |
| **Virtual vs Physical** | - **Virtual Address Space (VAS)**: Contiguous perspective seen by user application.<br>- **Physical Address Space (PAS)**: Disjoint physical frames mapped across DRAM banks. |
| **MMU & Translation** | - **Memory Management Unit**: Hardware device translating virtual address to physical address in real time.<br>- If page is not resident, triggers interrupt vector \`#PF\` (Page Fault). |
| **Page Table Structure** | - **Base Register (CR3 on x86-64)**: Holds root physical pointer to PGD (Page Global Directory).<br>- 4-Level translation: \`PML4 -> PDPT -> PD -> PT -> Offset\`. |
| **TLB Acceleration** | - **Translation Lookaside Buffer**: Fully associative cache holding recent tag-to-frame translations.<br>- Reduces effective memory access time (EMAT) from ~200ns to <2ns. |

---

## 3. High-Performance Hardware Diagram
\`\`\`
+-------------------------+
|   CPU Execution Core    |
+------------+------------+
             | Virtual Address (VPN | Offset)
             v
      +--------------+      Hit      +-----------------------+
      |   TLB Unit   |-------------->|  Physical Frame (PFN) |
      +-------+------+               +-----------+-----------+
              | Miss                             |
              v                                  |
      +--------------+                           |
      | Page Table   |                           |
      | Walker (CR3) |                           |
      +-------+------+                           |
              |                                  v
              +-----------------------------> RAM DRAM
\`\`\`

---

## 4. Key Formulas & Computations
- **Page Size**: $P = 4096 \\text{ bytes} = 2^{12} \\text{ bytes}$
- **Virtual Page Number**: $\\text{VPN} = \\text{Virtual Address} \\gg 12$
- **Effective Access Time (EAT)**:
  $$\\text{EAT} = \\alpha \\cdot (t_{\\text{TLB}} + t_{\\text{RAM}}) + (1 - \\alpha) \\cdot (t_{\\text{TLB}} + (k+1) \\cdot t_{\\text{RAM}})$$
  *(where $\\alpha$ is the TLB hit ratio and $k$ is the page table tree depth)*.
`,
  diagrams: [
    `+-------------------------------------------------------+
| VIRTUAL ADDRESS SPACE: 0x00000000 -> 0x7FFFFFFFFFFF   |
+-------------------------------------------------------+
| [ Code ] [ Data ] [ BSS ] [ Heap -> ] [ <- Stack ]    |
+-------------------------------------------------------+`,
  ],
  codeSnippets: [
    {
      language: "c",
      code: `// Virtual to Physical address decomposition
uint64_t vaddr = 0x7ffd9820;
uint64_t page_offset = vaddr & 0xFFF;
uint64_t vpn = vaddr >> 12;

printf("VPN: 0x%lx, Offset: 0x%lx\\n", vpn, page_offset);`,
      output: "VPN: 0x7ffd9, Offset: 0x820",
    },
  ],
};

