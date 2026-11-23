/**
 * SkillBridge - Technical Skill Assessment Controller
 * Comprehensive engine for technical MCQs, live countdown timer, answer evaluation,
 * question navigation, auto-submission, localStorage persistence, and educational results review.
 */

// ==========================================================================
// 1. Question Bank & Assessment Metadata (Real Technical Questions)
// ==========================================================================
const AssessmentData = {
  assessments: [
    {
      id: "java",
      title: "Java Core & OOP",
      technology: "Java",
      category: "Backend",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-amber text-warning",
      icon: "bi-cup-hot-fill",
      iconColor: "#f59e0b",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Object-oriented principles, Collections framework, Multi-threading, JVM memory model, and Exception handling in modern Java.",
      questions: [
        {
          id: 1,
          question: "Which of the following statements is TRUE regarding the difference between ArrayList and LinkedList in Java?",
          options: [
            "ArrayList is implemented as a doubly linked list, while LinkedList uses a resizable array.",
            "ArrayList provides O(1) time complexity for arbitrary index lookups, whereas LinkedList requires O(n) traversal.",
            "LinkedList consumes less memory than ArrayList because it does not allocate contiguous memory.",
            "ArrayList allows synchronized access by default, whereas LinkedList is non-synchronized."
          ],
          correct: 1,
          explanation: "ArrayList is backed by a dynamic array providing constant time O(1) random access, whereas LinkedList consists of nodes with pointers, requiring O(n) linear traversal to access elements by index."
        },
        {
          id: 2,
          question: "What happens when you invoke the start() method on a Java Thread object instead of run()?",
          options: [
            "start() creates a new operating system thread and then executes run() asynchronously.",
            "start() executes the run() method synchronously on the calling thread.",
            "start() causes a RuntimeException if run() has not been marked synchronized.",
            "There is no difference; start() is simply a deprecated alias for run()."
          ],
          correct: 0,
          explanation: "Calling start() allocates native call-stack resources and spawns a new thread in the JVM, which subsequently calls run(). Calling run() directly merely executes it synchronously on the current thread."
        },
        {
          id: 3,
          question: "Which keyword in Java prevents a class from being subclassed and a method from being overridden?",
          options: ["static", "abstract", "final", "sealed"],
          correct: 2,
          explanation: "The 'final' modifier prevents inheritance when applied to a class, and prevents overriding when applied to a method."
        },
        {
          id: 4,
          question: "In Java's memory model, where are local primitive variables and object references stored during execution?",
          options: ["In the Metaspace", "On the Heap", "On the Thread Stack", "In the PermGen space"],
          correct: 2,
          explanation: "Local variables, method parameters, and object references reside on the Thread Stack frame for the active method, while the actual objects reside on the Heap."
        },
        {
          id: 5,
          question: "What is the primary contract between equals() and hashCode() in Java?",
          options: [
            "If two objects have the same hashCode(), they must always be equal according to equals().",
            "If two objects are equal according to equals(), they must produce the same hashCode().",
            "hashCode() must always return a strictly unique integer for every distinct memory address.",
            "Overriding equals() never requires overriding hashCode()."
          ],
          correct: 1,
          explanation: "The Java specification mandates that if two objects are equal according to equals(), their hashCode() values must be identical to ensure correct behavior in hash-based collections like HashMap and HashSet."
        },
        {
          id: 6,
          question: "Which of the following interfaces is the root of the Java Collections hierarchy that does NOT extend Collection?",
          options: ["List", "Set", "Queue", "Map"],
          correct: 3,
          explanation: "Map<K,V> is part of the Java Collections Framework, but it represents key-value associations and does not extend the java.util.Collection interface."
        },
        {
          id: 7,
          question: "What is the purpose of the 'volatile' keyword when applied to a Java variable?",
          options: [
            "It ensures that operations on the variable are atomic.",
            "It guarantees that reads and writes are made directly to main memory, ensuring visibility across threads.",
            "It locks the variable so that only one thread can access it at any given time.",
            "It marks the variable as serializable across network streams."
          ],
          correct: 1,
          explanation: "'volatile' guarantees memory visibility by preventing thread caching in CPU registers and establishing a happens-before relationship, although it does not provide full atomicity for compound operations like count++."
        },
        {
          id: 8,
          question: "How does the try-with-resources statement in Java manage resource closure?",
          options: [
            "It invokes the finalize() method before garbage collection.",
            "It automatically invokes close() on any object implementing java.lang.AutoCloseable at the end of the block.",
            "It requires an explicit finally block to dispose of underlying file streams.",
            "It only works with network socket connections."
          ],
          correct: 1,
          explanation: "Introduced in Java 7, try-with-resources automatically closes any resource that implements java.lang.AutoCloseable, eliminating boilerplate finally blocks and preventing resource leaks."
        },
        {
          id: 9,
          question: "What is the time complexity of searching for an element in a balanced Java TreeMap?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correct: 1,
          explanation: "TreeMap is backed by a Red-Black Tree (a self-balancing binary search tree), guaranteeing O(log n) time complexity for containsKey(), get(), put(), and remove() operations."
        },
        {
          id: 10,
          question: "What is the behavior of the String.intern() method?",
          options: [
            "It forces the string to be encoded into UTF-8 byte arrays.",
            "It searches the JVM String Constant Pool for an equivalent string and returns the canonical pool reference.",
            "It encrypts the string in memory to prevent heap inspection.",
            "It converts a mutable StringBuilder into an immutable String."
          ],
          correct: 1,
          explanation: "intern() returns a canonical representation from the String Pool. If the pool already contains an equivalent string, it returns that instance; otherwise, it adds the string to the pool and returns its reference."
        }
      ]
    },
    {
      id: "spring",
      title: "Spring Boot & REST APIs",
      technology: "Spring Boot",
      category: "Backend",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-emerald text-success",
      icon: "bi-layers-fill",
      iconColor: "#10b981",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "IoC containers, Dependency Injection, REST controllers, Spring Data JPA, and application configuration in Spring Boot 3.",
      questions: [
        {
          id: 1,
          question: "What does the @RestController annotation signify in a Spring Boot application?",
          options: [
            "It is equivalent to combining @Controller and @ResponseBody, returning serialized domain objects directly as JSON/XML.",
            "It indicates that the controller must strictly render JSP or Thymeleaf HTML view templates.",
            "It configures a WebSocket server endpoint for bidirectional messaging.",
            "It makes all controller methods execute in a separate background thread pool."
          ],
          correct: 0,
          explanation: "@RestController is a convenience meta-annotation that combines @Controller and @ResponseBody, automatically serializing method return values directly into the HTTP response body."
        },
        {
          id: 2,
          question: "Which annotation is used to inject dependencies automatically into a Spring-managed bean?",
          options: ["@Injectable", "@Autowired", "@Component", "@Bean"],
          correct: 1,
          explanation: "@Autowired allows Spring's dependency injection container to automatically resolve and inject collaborating beans into constructor, setter, or field targets."
        },
        {
          id: 3,
          question: "What is the recommended injection style for Spring components according to official guidelines?",
          options: ["Field injection with @Autowired", "Setter injection", "Constructor injection", "Static factory injection"],
          correct: 2,
          explanation: "Constructor injection is strongly recommended because it ensures immutability (final fields), guarantees that all required dependencies are provided at creation, and simplifies unit testing with mocks."
        },
        {
          id: 4,
          question: "Which file is the standard configuration file used by Spring Boot applications by default?",
          options: ["beans.xml", "application.properties or application.yml", "web.xml", "spring-context.json"],
          correct: 1,
          explanation: "Spring Boot automatically loads externalized configuration properties from application.properties or application.yml located in src/main/resources."
        },
        {
          id: 5,
          question: "In Spring Data JPA, how does derived query method naming work?",
          options: [
            "Spring parses method names like findByLastNameAndAgeGreaterThan and derives SQL queries automatically at runtime.",
            "The developer must always provide a native SQL query using @NativeQuery.",
            "Method names are mapped to stored procedures registered in the database catalog.",
            "Queries must be compiled into bytecodes using an external Maven plugin."
          ],
          correct: 0,
          explanation: "Spring Data JPA's query generator parses method names prefixed with findBy, countBy, etc., and parses property expressions to automatically construct JPQL queries."
        },
        {
          id: 6,
          question: "What HTTP status code should be returned when a new resource is successfully created via a POST request in a REST API?",
          options: ["200 OK", "201 Created", "204 No Content", "202 Accepted"],
          correct: 1,
          explanation: "HTTP status 201 Created indicates that the request succeeded and led to the creation of a new resource, typically accompanied by a Location header."
        },
        {
          id: 7,
          question: "What is the role of the @Transactional annotation in Spring?",
          options: [
            "It optimizes SQL queries by caching them in Redis.",
            "It wraps the method execution in a database transaction, rolling back automatically upon unchecked (RuntimeException) exceptions.",
            "It validates JSON request payloads against schema constraints.",
            "It enables SSL/TLS encryption for database communication."
          ],
          correct: 1,
          explanation: "@Transactional configures declarative transaction management, opening a database connection, starting a transaction, committing upon success, and triggering rollbacks on uncaught RuntimeExceptions."
        },
        {
          id: 8,
          question: "Which Spring Boot feature provides production-ready health checks, metrics, and application monitoring endpoints?",
          options: ["Spring Boot DevTools", "Spring Boot Actuator", "Spring Security", "Spring Initializr"],
          correct: 1,
          explanation: "Spring Boot Actuator exposes operational endpoints such as /actuator/health, /actuator/metrics, and /actuator/info for monitoring application status in production environments."
        },
        {
          id: 9,
          question: "What is the difference between @PathVariable and @RequestParam in a Spring MVC controller?",
          options: [
            "@PathVariable extracts values from the URI path (/users/{id}), while @RequestParam extracts query parameters (/users?id=1).",
            "@PathVariable is for form submissions; @RequestParam is for JSON bodies.",
            "@PathVariable is only valid for GET requests; @RequestParam is for POST requests.",
            "There is no difference; they can be used interchangeably."
          ],
          correct: 0,
          explanation: "@PathVariable binds URI template variables (e.g., /api/internships/{id}), while @RequestParam binds query string parameters (e.g., /api/internships?category=Java)."
        },
        {
          id: 10,
          question: "Which annotation triggers automatic component scanning and auto-configuration in the main application class?",
          options: ["@EnableAutoConfiguration", "@ComponentScan", "@SpringBootApplication", "@Configuration"],
          correct: 2,
          explanation: "@SpringBootApplication is a meta-annotation that encapsulates @Configuration, @EnableAutoConfiguration, and @ComponentScan with default attributes."
        }
      ]
    },
    {
      id: "mysql",
      title: "MySQL & Database Design",
      technology: "MySQL",
      category: "Database",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-cyan text-info",
      icon: "bi-database-fill",
      iconColor: "#06b6d4",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Relational database modeling, indexing strategies, ACID guarantees, normalization, and query optimization.",
      questions: [
        {
          id: 1,
          question: "What data structure is standard for primary indexes in MySQL's default InnoDB storage engine?",
          options: ["Hash Table", "B+ Tree", "Red-Black Tree", "Skip List"],
          correct: 1,
          explanation: "InnoDB stores data in clustered B+ Trees where leaf nodes contain the actual row data ordered by primary key, optimizing range scans and sequential disk access."
        },
        {
          id: 2,
          question: "What does the 'I' in ACID transaction properties stand for, and what does it prevent?",
          options: [
            "Indexability: prevents duplicate table scans.",
            "Isolation: ensures concurrent transactions execute without interfering with one another.",
            "Integrity: ensures foreign key constraints are not violated.",
            "Idempotency: ensures repeating a query produces the exact same outcome."
          ],
          correct: 1,
          explanation: "Isolation ensures that uncommitted changes made by one transaction remain invisible to concurrent transactions, preventing anomalies like dirty reads, non-repeatable reads, and phantom reads."
        },
        {
          id: 3,
          question: "What is the difference between WHERE and HAVING clauses in an SQL query?",
          options: [
            "WHERE filters rows before aggregation, while HAVING filters aggregated grouped rows after GROUP BY.",
            "WHERE is only used with JOINs, while HAVING is used with subqueries.",
            "WHERE can use aggregate functions like COUNT(), but HAVING cannot.",
            "They are interchangeable synonyms in modern MySQL."
          ],
          correct: 0,
          explanation: "WHERE operates on individual records prior to grouping, whereas HAVING evaluates conditions on aggregated results produced by GROUP BY."
        },
        {
          id: 4,
          question: "What is Third Normal Form (3NF) in relational database normalization?",
          options: [
            "A table is in 2NF and has no transitive functional dependencies of non-key attributes on the primary key.",
            "A table has no multi-valued dependencies.",
            "A table has all atomic columns with no duplicate rows.",
            "A table has every non-prime attribute dependent on a subset of a candidate key."
          ],
          correct: 0,
          explanation: "3NF requires that a relation is in 2NF and that every non-key column depends only on the primary key, eliminating transitive dependencies (A -> B and B -> C)."
        },
        {
          id: 5,
          question: "Which SQL command is used to inspect the query execution plan and verify whether an index is being used?",
          options: ["ANALYZE QUERY", "EXPLAIN", "SHOW INDEXES", "OPTIMIZE TABLE"],
          correct: 1,
          explanation: "The EXPLAIN statement details how MySQL executes a query, indicating the tables scanned, join types, possible keys, and actual key chosen."
        },
        {
          id: 6,
          question: "What is the consequence of a FULL TABLE SCAN in a high-volume production database?",
          options: [
            "It locks the entire MySQL instance from receiving any new connections.",
            "It reads every page of the table from disk/buffer pool, drastically increasing I/O and query latency.",
            "It corrupts secondary indexes until an OPTIMIZE TABLE command is run.",
            "It automatically converts InnoDB tables into MyISAM format."
          ],
          correct: 1,
          explanation: "A full table scan occurs when MySQL must read every row in the table because no usable index exists, causing high CPU/disk I/O and degraded performance on large datasets."
        },
        {
          id: 7,
          question: "What is the default transaction isolation level in MySQL InnoDB?",
          options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
          correct: 2,
          explanation: "MySQL InnoDB defaults to REPEATABLE READ, utilizing multi-version concurrency control (MVCC) and next-key locking to prevent dirty reads, non-repeatable reads, and phantom reads in standard queries."
        },
        {
          id: 8,
          question: "How does a LEFT OUTER JOIN behave when a row in the left table has no matching row in the right table?",
          options: [
            "The row is excluded from the final result set.",
            "An SQL error is thrown due to missing foreign key values.",
            "The left row is returned with NULL values for all columns from the right table.",
            "The query replaces missing fields with blank strings."
          ],
          correct: 2,
          explanation: "A LEFT JOIN preserves all rows from the left table; if no corresponding match exists in the right table, columns from the right table are filled with NULL."
        },
        {
          id: 9,
          question: "Which of the following constraints enforces both uniqueness and NOT NULL automatically?",
          options: ["UNIQUE", "FOREIGN KEY", "PRIMARY KEY", "CHECK"],
          correct: 2,
          explanation: "A PRIMARY KEY constraint uniquely identifies each record in a table, implicitly enforcing that the column(s) cannot contain NULL values and must have unique entries."
        },
        {
          id: 10,
          question: "What is the key advantage of using a Composite Index on (department_id, graduation_year) in MySQL?",
          options: [
            "It automatically indexes every single column in the table.",
            "It can satisfy queries filtering on department_id alone, or department_id and graduation_year together, according to the leftmost prefix rule.",
            "It can satisfy queries filtering on graduation_year alone without using department_id.",
            "It compresses table storage by 50%."
          ],
          correct: 1,
          explanation: "MySQL composite indexes follow the Leftmost Prefix Rule: an index on (A, B) can accelerate queries filtering on (A) or (A, B), but not queries filtering only on (B)."
        }
      ]
    },
    {
      id: "python",
      title: "Python Programming",
      technology: "Python",
      category: "Programming",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-primary text-primary",
      icon: "bi-filetype-py",
      iconColor: "#4f46e5",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Python data structures, decorators, generator expressions, memory management, and OOP features.",
      questions: [
        {
          id: 1,
          question: "What is the key difference between a Python list and a tuple?",
          options: [
            "Lists are immutable; tuples are mutable.",
            "Lists are mutable and can be modified after creation; tuples are immutable.",
            "Tuples cannot contain heterogeneous data types, while lists can.",
            "Lists use parentheses (), while tuples use square brackets []."
          ],
          correct: 1,
          explanation: "Lists are mutable sequences that can be appended, modified, or reordered in-place. Tuples are immutable and cannot be altered once instantiated."
        },
        {
          id: 2,
          question: "What does the 'yield' keyword do inside a Python function?",
          options: [
            "It immediately terminates the function and raises an exception.",
            "It turns the function into a generator, producing values lazily on-demand without storing the entire sequence in memory.",
            "It transfers execution priority to the operating system thread scheduler.",
            "It imports external C-extension modules into the global namespace."
          ],
          correct: 1,
          explanation: "'yield' pauses function execution and emits a value to the caller, resuming state on subsequent next() invocations. This allows memory-efficient iteration through generators."
        },
        {
          id: 3,
          question: "What is the output of the following list comprehension: [x * 2 for x in range(5) if x % 2 == 0]?",
          options: ["[0, 2, 4]", "[0, 4, 8]", "[2, 4, 6]", "[0, 2, 4, 6, 8]"],
          correct: 1,
          explanation: "range(5) yields 0, 1, 2, 3, 4. The condition x % 2 == 0 filters for even numbers (0, 2, 4). Multiplying each by 2 produces [0, 4, 8]."
        },
        {
          id: 4,
          question: "What is a Python decorator?",
          options: [
            "A syntax extension used to declare CSS styles in desktop GUI apps.",
            "A callable that takes another function as an argument and extends or modifies its behavior without altering its source code.",
            "A special type of class constructor used for multiple inheritance.",
            "A tool used to compile Python code into C binaries."
          ],
          correct: 1,
          explanation: "Decorators wrap functions using the @decorator syntax, allowing reusable cross-cutting concerns like logging, authentication, and execution timing."
        },
        {
          id: 5,
          question: "What does the Global Interpreter Lock (GIL) in CPython do?",
          options: [
            "It prevents Python from connecting to external relational databases.",
            "It is a mutex that prevents multiple native threads from executing Python bytecodes simultaneously in a single process.",
            "It protects the Python virtual environment from untrusted network downloads.",
            "It automatically serializes all dictionary operations into JSON."
          ],
          correct: 1,
          explanation: "CPython's GIL ensures thread safety by permitting only one thread to execute Python bytecode at a time, making multiprocessing preferable over multithreading for CPU-bound tasks."
        },
        {
          id: 6,
          question: "What is the result of the expression: type([]) is list and type({}) is dict?",
          options: ["True", "False", "None", "Raises TypeError"],
          correct: 0,
          explanation: "In Python, [] instantiates a list and {} instantiates a dictionary. Both type checks evaluate to True."
        },
        {
          id: 7,
          question: "How are arguments passed in Python (Pass-by-value or Pass-by-reference)?",
          options: [
            "Strictly pass-by-value.",
            "Strictly pass-by-reference.",
            "Pass-by-object-reference (or pass-by-assignment).",
            "Primitives are passed by pointer; objects are copied."
          ],
          correct: 2,
          explanation: "Python uses 'pass-by-object-reference'. If an object is mutable (e.g. list, dict), modifying it inside the function affects the caller; if immutable (e.g. int, str), rebinding the name does not affect the caller."
        },
        {
          id: 8,
          question: "Which built-in module is used to work with regular expressions in Python?",
          options: ["regex_py", "re", "pattern", "string.regex"],
          correct: 1,
          explanation: "The 're' module is Python's standard library for regular expression search, match, and substitution operations."
        },
        {
          id: 9,
          question: "What will dict.get('missing_key', 'default_val') return if 'missing_key' does not exist?",
          options: ["Raises KeyError", "'default_val'", "None", "Empty string"],
          correct: 1,
          explanation: "Unlike dict['key'] which raises a KeyError when missing, dict.get(key, default) safely returns the specified fallback default value."
        },
        {
          id: 10,
          question: "What is the difference between '==' and 'is' in Python?",
          options: [
            "'==' compares object values for equality, while 'is' checks for memory identity (same object in memory).",
            "'==' checks memory address, while 'is' checks data type.",
            "'is' is only used for numerical comparisons.",
            "There is no difference; they are strictly interchangeable."
          ],
          correct: 0,
          explanation: "'==' checks whether two objects have equivalent contents, while 'is' evaluates whether two references point to the exact same object in memory (id(a) == id(b))."
        }
      ]
    },
    {
      id: "react",
      title: "React.js & Frontend Architecture",
      technology: "React",
      category: "Frontend",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-cyan text-info",
      icon: "bi-atom",
      iconColor: "#06b6d4",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Virtual DOM, JSX, Hooks (useState, useEffect, useMemo), Props, Component lifecycle, and State management.",
      questions: [
        {
          id: 1,
          question: "What is the primary advantage of the Virtual DOM in React?",
          options: [
            "It eliminates the need for JavaScript in the browser.",
            "It computes differences (diffing) in-memory and batch updates only the changed parts of the real DOM.",
            "It writes changes directly to GPU memory for hardware acceleration.",
            "It bypasses standard browser security sandboxing."
          ],
          correct: 1,
          explanation: "React maintains a lightweight Virtual DOM tree in memory. On state changes, it reconciles the new virtual tree against the previous one and applies minimal batched mutations to the real DOM."
        },
        {
          id: 2,
          question: "Which Hook should be used to perform side effects (such as data fetching or subscriptions) in functional components?",
          options: ["useReducer", "useEffect", "useCallback", "useLayout"],
          correct: 1,
          explanation: "useEffect serves as the unified hook for performing side-effects, combining the capabilities of componentDidMount, componentDidUpdate, and componentWillUnmount."
        },
        {
          id: 3,
          question: "What happens if you provide an empty dependency array [] to useEffect?",
          options: [
            "The effect runs after every single render.",
            "The effect never runs at all.",
            "The effect runs only once after the initial mount, similar to componentDidMount.",
            "An error is thrown during component compilation."
          ],
          correct: 2,
          explanation: "An empty dependency array [] indicates that the effect has no reactive dependencies, meaning it executes once when the component mounts and cleans up when it unmounts."
        },
        {
          id: 4,
          question: "Why should you avoid updating state directly (e.g., state.count = 5) in React?",
          options: [
            "Direct mutations prevent React from detecting changes and triggering a re-render.",
            "Direct mutations are blocked by the browser V8 engine.",
            "Direct mutations delete component prop types.",
            "Direct mutations automatically convert integers into strings."
          ],
          correct: 0,
          explanation: "React relies on immutability and shallow equality checks. Mutating state directly bypasses setter functions, preventing scheduled reconciliation and UI updates."
        },
        {
          id: 5,
          question: "What is the purpose of the 'key' prop when rendering dynamic lists in React?",
          options: [
            "It styles list items with alternating CSS colors.",
            "It gives React a stable identity for each element to optimize re-ordering, additions, and deletions during diffing.",
            "It encrypts DOM nodes to prevent XSS attacks.",
            "It binds the element to a database primary key automatically."
          ],
          correct: 1,
          explanation: "Keys help React identify which items have changed, been added, or been removed, avoiding unnecessary re-creations of subtrees."
        },
        {
          id: 6,
          question: "How does 'Lifting State Up' work in React architecture?",
          options: [
            "Moving shared state to the closest common ancestor of the components that need it.",
            "Saving state into the browser's localStorage.",
            "Converting functional components into class components.",
            "Using global window variables to share data."
          ],
          correct: 0,
          explanation: "When several components need to reflect the same changing data, lifting shared state up to their closest common ancestor ensures a single source of truth."
        },
        {
          id: 7,
          question: "What is the primary difference between useMemo and useCallback?",
          options: [
            "useMemo memoizes a computed value, while useCallback memoizes a callback function definition.",
            "useMemo is for asynchronous functions; useCallback is for synchronous functions.",
            "useMemo triggers re-renders; useCallback prevents re-renders.",
            "There is no difference; they are aliases."
          ],
          correct: 0,
          explanation: "useMemo caches the result of a calculation between renders, while useCallback caches a function definition itself across renders until its dependencies change."
        },
        {
          id: 8,
          question: "What is a Controlled Component in React?",
          options: [
            "A component whose form data is handled by the React component state rather than the DOM.",
            "A component restricted by user authentication permissions.",
            "A component rendered exclusively on a Node.js server.",
            "A component that cannot receive props from its parent."
          ],
          correct: 0,
          explanation: "In a controlled component, form element values (like <input value={val} onChange={...} />) are driven by React state, giving full programmatic control over input handling."
        },
        {
          id: 9,
          question: "What problem does the React Context API solve?",
          options: [
            "It replaces the database for data storage.",
            "It avoids 'prop drilling' by sharing values across the entire component tree without explicitly passing props at every level.",
            "It compiles JSX into WebAssembly.",
            "It automatically optimizes CSS transitions."
          ],
          correct: 1,
          explanation: "Context provides a way to pass data (such as themes, auth status, or language) through the component tree without manually threading props down through every intermediate component."
        },
        {
          id: 10,
          question: "What is the fundamental rule regarding the invocation of React Hooks?",
          options: [
            "Hooks must only be called at the top level of React function components or custom hooks, never inside loops, conditions, or nested functions.",
            "Hooks can be called anywhere in regular JavaScript helper functions.",
            "Hooks must only be called inside class constructor methods.",
            "Hooks can only be invoked asynchronously inside setTimeout."
          ],
          correct: 0,
          explanation: "The Rules of Hooks mandate calling them at the top level to guarantee that Hooks are called in the exact same order on every render, preserving internal state associations."
        }
      ]
    },
    {
      id: "javascript",
      title: "JavaScript (ES6+) & Web APIs",
      technology: "JavaScript",
      category: "Frontend",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-emerald text-success",
      icon: "bi-filetype-js",
      iconColor: "#10b981",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Asynchronous execution, Event Loop, Closures, Promises, Prototypal inheritance, and Modern ES6+ features.",
      questions: [
        {
          id: 1,
          question: "What is a Closure in JavaScript?",
          options: [
            "A syntax error caused by unclosed curly braces.",
            "A function that retains access to its outer lexical scope even when the function is executed outside that scope.",
            "A method used to immediately terminate an asynchronous Promise chain.",
            "A DOM manipulation method used to hide modal dialogs."
          ],
          correct: 1,
          explanation: "A closure is formed when an inner function remembers and accesses variables from its enclosing lexical environment, even after the parent function has completed execution."
        },
        {
          id: 2,
          question: "What is the output of: console.log(typeof NaN)?",
          options: ["'undefined'", "'nan'", "'number'", "'object'"],
          correct: 2,
          explanation: "In JavaScript, NaN stands for 'Not a Number', but according to the IEEE 754 floating-point specification and ECMAScript, its data type is officially 'number'."
        },
        {
          id: 3,
          question: "How does the JavaScript Event Loop handle microtasks (e.g., Promise.then) versus macrotasks (e.g., setTimeout)?",
          options: [
            "Macrotasks have higher priority and run before all microtasks.",
            "Microtasks are executed immediately after the current synchronous script runs and before the next macrotask is processed.",
            "They run simultaneously on separate CPU threads.",
            "Microtasks are only supported in Node.js, not browsers."
          ],
          correct: 1,
          explanation: "The Event Loop executes the synchronous call stack, then exhausts the entire microtask queue (Promises, queueMicrotask) before picking the next macrotask (setTimeout, setInterval, I/O)."
        },
        {
          id: 4,
          question: "What is the difference between 'let' and 'var' declarations in JavaScript?",
          options: [
            "'var' is block-scoped, while 'let' is function-scoped.",
            "'let' is block-scoped and not accessible before declaration (Temporal Dead Zone), while 'var' is function-scoped and hoisted with undefined.",
            "'let' creates global properties on window, while 'var' does not.",
            "'var' prevents reassignment; 'let' allows reassignment."
          ],
          correct: 1,
          explanation: "'let' introduced in ES6 has block scoping and resides in the Temporal Dead Zone until initialized, whereas 'var' is function-scoped and hoisted to the top of its scope as undefined."
        },
        {
          id: 5,
          question: "Which array method returns a brand new array containing only elements that pass a test condition?",
          options: ["forEach()", "filter()", "map()", "reduce()"],
          correct: 1,
          explanation: "Array.prototype.filter() creates a shallow copy of a portion of the given array, filtered down to just the elements that return truthy for the callback function."
        },
        {
          id: 6,
          question: "What does the Promise.all() method do when one of the passed promises rejects?",
          options: [
            "It ignores the rejected promise and returns all fulfilled ones.",
            "It immediately rejects with the reason of the first promise that rejects.",
            "It retries the rejected promise up to 3 times.",
            "It returns an array containing null values for rejected items."
          ],
          correct: 1,
          explanation: "Promise.all() adheres to a fail-fast behavior: if any promise in the iterable rejects, the returned promise immediately rejects with that error."
        },
        {
          id: 7,
          question: "What is the result of '5' + 3 versus '5' - 3 in JavaScript?",
          options: ["'53' and 2", "8 and 2", "'53' and NaN", "8 and '5-3'"],
          correct: 0,
          explanation: "The + operator concatenates strings when one operand is a string, resulting in '53'. The - operator only performs arithmetic subtraction, coercing '5' into the number 5, resulting in 2."
        },
        {
          id: 8,
          question: "What does 'use strict' enforce in JavaScript?",
          options: [
            "It converts JavaScript into strongly typed TypeScript at runtime.",
            "It catches common coding mistakes, prevents the use of undeclared global variables, and eliminates 'this' coercion to window in plain functions.",
            "It forces all network requests to use HTTPS.",
            "It disables all asynchronous execution."
          ],
          correct: 1,
          explanation: "Strict Mode prevents accidental globals (e.g. assigning to undeclared variables), throws errors on silent failures, and keeps 'this' undefined in non-method functions."
        },
        {
          id: 9,
          question: "How do Arrow Functions handle the 'this' keyword compared to regular function declarations?",
          options: [
            "Arrow functions bind 'this' to the DOM element that triggered the event.",
            "Arrow functions do not have their own 'this'; they inherit 'this' lexically from the enclosing parent scope.",
            "Arrow functions create a brand new isolated 'this' context on every invocation.",
            "Arrow functions can be bound using .bind(), .call(), or .apply()."
          ],
          correct: 1,
          explanation: "Arrow functions lack their own 'this' binding, arguments object, and prototype; they lexically capture the 'this' value of the enclosing execution context."
        },
        {
          id: 10,
          question: "Which modern feature allows unpacking values from arrays or properties from objects into distinct variables?",
          options: ["Spreading", "Destructuring Assignment", "Currying", "Memoization"],
          correct: 1,
          explanation: "Destructuring assignment allows expressions like const { name, age } = user; or const [first, second] = array; to extract values conveniently."
        }
      ]
    },
    {
      id: "htmlcss",
      title: "HTML5, CSS3 & Responsive Design",
      technology: "HTML & CSS",
      category: "Frontend",
      difficulty: "Intermediate",
      badgeClass: "bg-soft-pink text-danger",
      icon: "bi-code-slash",
      iconColor: "#be185d",
      durationMinutes: 10,
      totalQuestions: 10,
      description: "Semantic markup, Flexbox layouts, CSS Grid, Box Model, viewport media queries, and accessibility best practices.",
      questions: [
        {
          id: 1,
          question: "Which CSS property configuration is used to center an element horizontally and vertically using Flexbox?",
          options: [
            "display: flex; justify-content: center; align-items: center;",
            "display: block; margin: auto; text-align: center;",
            "display: flex; float: center; align-content: middle;",
            "display: inline; vertical-align: middle; horizontal-align: center;"
          ],
          correct: 0,
          explanation: "On a flex container, justify-content: center aligns items along the main axis, and align-items: center aligns items along the cross axis."
        },
        {
          id: 2,
          question: "What is the difference between 'display: none' and 'visibility: hidden' in CSS?",
          options: [
            "'display: none' removes the element from document layout flow, while 'visibility: hidden' hides it while preserving its occupied space.",
            "'visibility: hidden' deletes the element from the DOM tree entirely.",
            "'display: none' is only valid for images; 'visibility: hidden' is for text.",
            "They are exact synonyms."
          ],
          correct: 0,
          explanation: "'display: none' removes the element from rendering flow so it occupies zero space. 'visibility: hidden' makes the element invisible but retains its dimensions and layout footprint."
        },
        {
          id: 3,
          question: "What are the components of the standard CSS Box Model from inside out?",
          options: [
            "Content, Padding, Border, Margin",
            "Content, Margin, Border, Padding",
            "Border, Margin, Padding, Content",
            "Padding, Content, Border, Outline"
          ],
          correct: 0,
          explanation: "The CSS box model consists of Content at the center, surrounded by Padding (interior spacing), Border, and Margin (exterior spacing)."
        },
        {
          id: 4,
          question: "What does 'box-sizing: border-box' accomplish in CSS?",
          options: [
            "It forces all borders to be rendered with rounded corners.",
            "It includes padding and border within the element's specified width and height, preventing unexpected layout expansions.",
            "It eliminates all margins between sibling elements.",
            "It creates a shadow around the element's border box."
          ],
          correct: 1,
          explanation: "With 'border-box', an element's total width and height includes its content, padding, and border. Adding padding will not make the element wider than its declared width."
        },
        {
          id: 5,
          question: "Which of the following is a semantic HTML5 element designed to represent independent, self-contained content?",
          options: ["<div>", "<article>", "<span>", "<container>"],
          correct: 1,
          explanation: "<article> represents an independent, distributable piece of content such as a blog post, news story, or forum entry, enhancing accessibility and SEO."
        },
        {
          id: 6,
          question: "What does the 'rem' CSS unit represent?",
          options: [
            "Relative to the font-size of the immediate parent element.",
            "Relative to the font-size of the root element (typically <html>, default 16px).",
            "Relative to the width of the device screen resolution.",
            "Relative to the height of the browser viewport."
          ],
          correct: 1,
          explanation: "'rem' stands for 'root em'. 1rem equals the computed font-size of the root <html> element, facilitating scalable responsive typography."
        },
        {
          id: 7,
          question: "What is the primary purpose of the 'alt' attribute on an <img> tag?",
          options: [
            "It defines the tooltip displayed on hover.",
            "It provides alternative text for screen readers and displays when the image fails to load, ensuring accessibility.",
            "It specifies the image file compression algorithm.",
            "It links the image to a high-resolution download source."
          ],
          correct: 1,
          explanation: "The 'alt' attribute provides textual description for visually impaired users using screen readers and serves as a fallback when image files fail to load."
        },
        {
          id: 8,
          question: "What CSS Grid property defines the column sizing tracks of a grid container?",
          options: ["grid-column-gap", "grid-template-columns", "grid-auto-flow", "grid-direction"],
          correct: 1,
          explanation: "grid-template-columns defines the line names and track sizing functions of the grid columns (e.g. repeat(3, 1fr))."
        },
        {
          id: 9,
          question: "Which media query breakpoint targets viewports with a minimum width of 768 pixels?",
          options: [
            "@media (max-width: 768px)",
            "@media (min-width: 768px)",
            "@media screen and (width == 768px)",
            "@media (device-width: 768px)"
          ],
          correct: 1,
          explanation: "@media (min-width: 768px) applies styles to screens that are 768 pixels wide or greater, following standard mobile-first responsive architecture."
        },
        {
          id: 10,
          question: "In CSS specificity rules, which selector has the highest specificity weight?",
          options: [
            "An element type selector (e.g., div)",
            "A class selector (e.g., .btn)",
            "An ID selector (e.g., #submitBtn)",
            "A universal selector (*)"
          ],
          correct: 2,
          explanation: "Specificity follows: Inline styles > ID selectors (0,1,0,0) > Class / Attribute / Pseudo-class selectors (0,0,1,0) > Element / Pseudo-element selectors (0,0,0,1)."
        }
      ]
    },
    {
      id: "dsa",
      title: "Data Structures & Algorithms",
      technology: "Data Structures",
      category: "Computer Science",
      difficulty: "Advanced",
      badgeClass: "bg-soft-purple text-purple",
      icon: "bi-diagram-3-fill",
      iconColor: "#7e22ce",
      durationMinutes: 12,
      totalQuestions: 10,
      description: "Big-O complexities, Binary Search Trees, Stacks, Queues, Sorting algorithms, and Graph traversals.",
      questions: [
        {
          id: 1,
          question: "What is the worst-case time complexity of QuickSort?",
          options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
          correct: 2,
          explanation: "While QuickSort has an average time complexity of O(n log n), its worst-case complexity degrades to O(n²) when the pivot chosen is consistently the smallest or largest element (e.g. on already sorted input with naive pivot selection)."
        },
        {
          id: 2,
          question: "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
          options: ["Queue", "Stack", "Binary Heap", "Hash Table"],
          correct: 1,
          explanation: "A Stack enforces LIFO access order: elements are pushed and popped from the same end (the top)."
        },
        {
          id: 3,
          question: "What is the time complexity to search for a key in a balanced Binary Search Tree (BST) containing n nodes?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correct: 1,
          explanation: "In a balanced BST (like an AVL or Red-Black tree), the height of the tree is bounded by O(log n), making search, insertion, and deletion O(log n)."
        },
        {
          id: 4,
          question: "What is the average time complexity of retrieving a value from a well-distributed Hash Table?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
          correct: 0,
          explanation: "With a uniform hash function and low load factor, hash table lookups take constant amortized time O(1)."
        },
        {
          id: 5,
          question: "Which traversal of a Binary Search Tree visits nodes in non-decreasing sorted order?",
          options: ["Pre-order traversal (Root, Left, Right)", "In-order traversal (Left, Root, Right)", "Post-order traversal (Left, Right, Root)", "Level-order traversal (BFS)"],
          correct: 1,
          explanation: "In-order traversal visits the left subtree (smaller keys), then the current node, then the right subtree (larger keys), producing values in ascending sorted order."
        },
        {
          id: 6,
          question: "Which algorithm is commonly used to find the shortest path in a weighted graph with non-negative edge weights?",
          options: ["Depth First Search (DFS)", "Dijkstra's Algorithm", "Kruskal's Algorithm", "Tarjan's Algorithm"],
          correct: 1,
          explanation: "Dijkstra's algorithm employs a priority queue to compute single-source shortest paths on weighted graphs with non-negative edge weights in O((V + E) log V) time."
        },
        {
          id: 7,
          question: "What is the space complexity of an in-place sorting algorithm like HeapSort?",
          options: ["O(1) auxiliary space", "O(log n) auxiliary space", "O(n) auxiliary space", "O(n²) auxiliary space"],
          correct: 0,
          explanation: "HeapSort sorts the array in-place by transforming the input array into a binary heap, requiring only O(1) auxiliary memory."
        },
        {
          id: 8,
          question: "What problem occurs in a singly linked list if two nodes point to each other in a closed loop?",
          options: ["Memory compaction failure", "Cycle / Infinite loop during traversal", "NullPointerException on head insertion", "Automatic conversion to a doubly linked list"],
          correct: 1,
          explanation: "A cycle causes standard traversal algorithms to loop indefinitely. Floyd's Cycle-Finding Algorithm (Tortoise and Hare) is typically used to detect cycles in O(n) time and O(1) space."
        },
        {
          id: 9,
          question: "What is the time complexity of Binary Search on a sorted array of size n?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correct: 1,
          explanation: "Binary search cuts the search interval in half at each iteration, yielding logarithmic O(log n) time complexity."
        },
        {
          id: 10,
          question: "Which queue data structure allows insertion and deletion at both ends?",
          options: ["PriorityQueue", "Deque (Double-Ended Queue)", "Circular Buffer", "Monotonic Stack"],
          correct: 1,
          explanation: "A Deque (Double-Ended Queue) supports efficient O(1) insertions and deletions at both the front and back of the sequence."
        }
      ]
    }
  ],

  // Load student profile for name/avatar display
  getStudentProfile() {
    try {
      const sessStr = localStorage.getItem('skillbridge_student_session');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess) {
          const name = sess.name || sess.fullName || 'Yazh S';
          const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'YS';
          return {
            id: sess.id || 'stud-101',
            fullName: name,
            email: sess.email || 'yazh.s@example.com',
            avatarInitials: initials,
            degree: sess.degree || 'B.E. Computer Science & Engineering',
            college: sess.college || 'Anna University / College of Engineering'
          };
        }
      }
      const stored = localStorage.getItem('skillbridge_registered_student');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read student profile', e);
    }
    return {
      id: "stud-101",
      fullName: "Yazh S",
      avatarInitials: "YS",
      degree: "B.E. Computer Science & Engineering",
      college: "Anna University / College of Engineering"
    };
  },

  // Load test history from localStorage (scoped to active student)
  getHistory() {
    const student = this.getStudentProfile();
    const studentId = student.id || 'stud-101';
    const key = `skillbridge_assessment_history_${studentId}`;
    try {
      const stored = localStorage.getItem(key) || localStorage.getItem('skillbridge_assessment_history');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read assessment history', e);
    }
    // Default initial demo history matching verified database benchmark
    return [
      {
        id: "hist-1",
        assessmentId: "java",
        title: "Java Core & OOP",
        technology: "Java",
        score: 9,
        total: 10,
        percentage: 90,
        tier: "Advanced",
        tierBadge: "bg-success",
        date: "18 Nov 2026",
        timeTaken: "06:45"
      },
      {
        id: "hist-2",
        assessmentId: "spring",
        title: "Spring Boot & REST APIs",
        technology: "Spring Boot",
        score: 9,
        total: 10,
        percentage: 90,
        tier: "Advanced",
        tierBadge: "bg-success",
        date: "15 Nov 2026",
        timeTaken: "08:12"
      },
      {
        id: "hist-3",
        assessmentId: "mysql",
        title: "MySQL & Database Design",
        technology: "MySQL",
        score: 8,
        total: 10,
        percentage: 80,
        tier: "Proficient",
        tierBadge: "bg-primary",
        date: "12 Nov 2026",
        timeTaken: "07:30"
      }
    ];
  },

  saveHistory(record) {
    const student = this.getStudentProfile();
    const studentId = student.id || 'stud-101';
    const key = `skillbridge_assessment_history_${studentId}`;
    const list = this.getHistory();
    list.unshift(record);
    try {
      localStorage.setItem(key, JSON.stringify(list));
      localStorage.setItem('skillbridge_assessment_history', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save assessment record', e);
    }
  }
};

// ==========================================================================
// 2. Active Quiz State & Timer Controller
// ==========================================================================
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {}; // { questionId: selectedOptionIndex }
let quizTimerInterval = null;
let timeRemainingSeconds = 0;
let totalTimeSeconds = 0;
let isSubmittingQuiz = false;

document.addEventListener('DOMContentLoaded', () => {
  initAssessmentPage();
});

function initAssessmentPage() {
  const student = AssessmentData.getStudentProfile();
  renderUserAvatars(student);

  renderAssessmentCatalog();
  renderHistoryTable();
  initQuizRunnerListeners();
  initMobileSidebarToggle();
  initLogoutHandler();

  // Check URL query parameters to auto-start specific assessment (e.g. ?skill=java, ?skill=spring, etc.)
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedSkill = params.get('skill') || params.get('tech') || params.get('assessment');
    if (requestedSkill) {
      const s = requestedSkill.trim().toLowerCase();
      const match = AssessmentData.assessments.find(a => 
        a.id.toLowerCase() === s || 
        a.technology.toLowerCase() === s || 
        a.technology.toLowerCase().includes(s) ||
        a.title.toLowerCase().includes(s)
      );
      if (match) {
        setTimeout(() => {
          startAssessment(match.id);
        }, 120);
      }
    }
  } catch (e) {
    console.warn('Error reading URL assessment parameter:', e);
  }
}

function renderUserAvatars(student) {
  const nameEls = document.querySelectorAll('.user-full-name');
  const initialsEls = document.querySelectorAll('.user-avatar-initials');

  nameEls.forEach(el => el.textContent = student.fullName || 'Yazh S');
  initialsEls.forEach(el => el.textContent = student.avatarInitials || 'YS');

  if (student.avatarUrl) {
    const sidebarImg = document.getElementById('sidebarAvatarImg');
    const sidebarInitials = document.getElementById('sidebarAvatarInitials');
    const topbarImg = document.getElementById('topbarAvatarImg');
    const topbarInitials = document.getElementById('topbarAvatarInitials');

    if (sidebarImg) { sidebarImg.src = student.avatarUrl; sidebarImg.classList.remove('d-none'); }
    if (sidebarInitials) { sidebarInitials.classList.add('d-none'); }

    if (topbarImg) { topbarImg.src = student.avatarUrl; topbarImg.classList.remove('d-none'); }
    if (topbarInitials) { topbarInitials.classList.add('d-none'); }
  }
}

/* --------------------------------------------------------------------------
   Screen 1: Assessment Catalog
   -------------------------------------------------------------------------- */
function renderAssessmentCatalog() {
  const container = document.getElementById('assessmentCardsContainer');
  if (!container) return;

  const list = AssessmentData.assessments;

  container.innerHTML = list.map(item => `
    <div class="col-12 col-md-6 col-xl-4 mb-3">
      <div class="card h-100 border shadow-xs p-4 rounded-4 bg-white profile-card-hover d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="rounded-3 p-3 d-flex align-items-center justify-content-center" style="background-color: #f1f5f9; width: 50px; height: 50px;">
            <i class="bi ${item.icon} fs-4" style="color: ${item.iconColor};"></i>
          </div>
          <span class="badge ${item.badgeClass} px-2 py-1 rounded-pill small">${item.difficulty}</span>
        </div>

        <h5 class="fw-bold text-dark mb-1">${item.title}</h5>
        <div class="d-flex gap-2 text-muted small mb-2" style="font-size: 0.78rem;">
          <span><i class="bi bi-question-circle me-1"></i>${item.totalQuestions} Questions</span>
          <span>&bull;</span>
          <span><i class="bi bi-clock me-1"></i>${item.durationMinutes} Minutes</span>
          <span>&bull;</span>
          <span class="text-primary fw-semibold">${item.category}</span>
        </div>

        <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.82rem; min-height: 2.8rem;">
          ${item.description}
        </p>

        <div class="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
          <span class="badge bg-light text-muted border"><i class="bi bi-shield-check me-1"></i>Verified Demo Engine</span>
          <button type="button" class="btn btn-primary-custom btn-sm px-3 start-quiz-btn" data-id="${item.id}">
            <i class="bi bi-play-fill me-1"></i> Start Assessment
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach start buttons
  container.querySelectorAll('.start-quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      startAssessment(id);
    });
  });
}

function renderHistoryTable() {
  const container = document.getElementById('assessmentHistoryTableBody');
  const countEl = document.getElementById('historyTotalTestsCount');
  if (!container) return;

  const history = AssessmentData.getHistory();
  if (countEl) countEl.textContent = `${history.length} Assessments Taken`;

  if (history.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted small">
          No assessments completed yet. Select a technology above to begin your first evaluation.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = history.map(item => `
    <tr>
      <td class="align-middle">
        <span class="fw-bold text-dark">${item.title}</span>
        <small class="text-muted d-block">${item.technology}</small>
      </td>
      <td class="align-middle">
        <span class="fw-bold text-primary">${item.score} / ${item.total}</span>
        <span class="badge bg-soft-primary ms-1">${item.percentage}%</span>
      </td>
      <td class="align-middle">
        <span class="badge ${item.tierBadge || 'bg-success'} px-2 py-1 rounded-pill small">${item.tier}</span>
      </td>
      <td class="align-middle text-muted small">
        <i class="bi bi-stopwatch me-1"></i>${item.timeTaken || '08:00'}
      </td>
      <td class="align-middle text-muted small">
        <i class="bi bi-calendar3 me-1"></i>${item.date}
      </td>
      <td class="align-middle text-end">
        <button type="button" class="btn btn-sm btn-outline-custom retake-from-history-btn" data-id="${item.assessmentId}">
          <i class="bi bi-arrow-clockwise"></i> Retake
        </button>
      </td>
    </tr>
  `).join('');

  container.querySelectorAll('.retake-from-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      startAssessment(id);
    });
  });
}

/* --------------------------------------------------------------------------
   Screen 2: Live Quiz Runner
   -------------------------------------------------------------------------- */
function startAssessment(assessmentId) {
  const quiz = AssessmentData.assessments.find(a => a.id === assessmentId);
  if (!quiz) {
    showAssessmentToast('Assessment module not found.', 'warning');
    return;
  }

  currentQuiz = quiz;
  currentQuestionIndex = 0;
  userAnswers = {};
  totalTimeSeconds = quiz.durationMinutes * 60;
  timeRemainingSeconds = totalTimeSeconds;

  // Switch views
  document.getElementById('overviewScreenSection').classList.add('d-none');
  document.getElementById('resultsScreenSection').classList.add('d-none');
  document.getElementById('quizRunnerSection').classList.remove('d-none');

  // Set quiz header info
  document.getElementById('runnerQuizTitle').textContent = quiz.title;
  document.getElementById('runnerQuizCategory').textContent = quiz.category;
  document.getElementById('runnerQuizDifficulty').textContent = quiz.difficulty;

  // Initialize Timer
  startQuizTimer();

  // Render question 1
  renderCurrentQuestion();
  renderQuestionNavigator();

  // Scroll to runner
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showAssessmentToast(`Assessment started: ${quiz.title}. Best of luck!`, 'info');
}

function startQuizTimer() {
  clearInterval(quizTimerInterval);
  const timerBox = document.getElementById('quizTimerDisplay');

  const updateDisplay = () => {
    const mins = Math.floor(timeRemainingSeconds / 60);
    const secs = timeRemainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timerBox) {
      timerBox.innerHTML = `<i class="bi bi-clock-history me-1"></i> ${formatted}`;
      if (timeRemainingSeconds <= 120) {
        timerBox.classList.add('warning');
      } else {
        timerBox.classList.remove('warning');
      }
    }

    if (timeRemainingSeconds <= 0) {
      clearInterval(quizTimerInterval);
      showAssessmentToast('Time expired! Your assessment has been automatically submitted.', 'warning');
      submitQuizEvaluation(true);
    } else {
      timeRemainingSeconds--;
    }
  };

  updateDisplay();
  quizTimerInterval = setInterval(updateDisplay, 1000);
}

function renderCurrentQuestion() {
  if (!currentQuiz) return;
  const q = currentQuiz.questions[currentQuestionIndex];
  if (!q) return;

  // Question numbering and text
  document.getElementById('runnerQuestionNumberBadge').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.totalQuestions}`;
  document.getElementById('runnerQuestionText').textContent = q.question;

  // Render 4 answer options
  const optionsContainer = document.getElementById('runnerOptionsContainer');
  const letters = ['A', 'B', 'C', 'D'];
  const selectedOption = userAnswers[q.id];

  optionsContainer.innerHTML = q.options.map((opt, idx) => {
    const isSelected = selectedOption === idx;
    return `
      <div class="quiz-option-item ${isSelected ? 'selected' : ''}" data-option-index="${idx}">
        <div class="quiz-option-letter">${letters[idx]}</div>
        <div class="fw-medium text-dark small flex-grow-1">${opt}</div>
        <div class="form-check m-0">
          <input class="form-check-input" type="radio" name="quizAnswerRadio" ${isSelected ? 'checked' : ''}>
        </div>
      </div>
    `;
  }).join('');

  // Attach option click listeners
  optionsContainer.querySelectorAll('.quiz-option-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-option-index'), 10);
      userAnswers[q.id] = idx;
      renderCurrentQuestion();
      renderQuestionNavigator();
    });
  });

  // Update navigation buttons
  const prevBtn = document.getElementById('quizPrevBtn');
  const nextBtn = document.getElementById('quizNextBtn');

  if (prevBtn) prevBtn.disabled = (currentQuestionIndex === 0);

  if (nextBtn) {
    if (currentQuestionIndex === currentQuiz.totalQuestions - 1) {
      nextBtn.innerHTML = 'Review & Submit <i class="bi bi-check2-circle ms-1"></i>';
      nextBtn.className = 'btn btn-success px-4';
    } else {
      nextBtn.innerHTML = 'Next Question <i class="bi bi-arrow-right ms-1"></i>';
      nextBtn.className = 'btn btn-primary-custom px-4';
    }
  }

  // Update progress bar
  const answeredCount = Object.keys(userAnswers).length;
  const progressPct = Math.round((answeredCount / currentQuiz.totalQuestions) * 100);
  const progressBar = document.getElementById('quizProgressBar');
  if (progressBar) {
    progressBar.style.width = `${progressPct}%`;
    progressBar.setAttribute('aria-valuenow', progressPct);
  }
}

function renderQuestionNavigator() {
  if (!currentQuiz) return;
  const grid = document.getElementById('questionNavigatorGrid');
  const answeredCountEl = document.getElementById('navAnsweredCount');
  const unansweredCountEl = document.getElementById('navUnansweredCount');

  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = currentQuiz.totalQuestions - answeredCount;

  if (answeredCountEl) answeredCountEl.textContent = `${answeredCount} Answered`;
  if (unansweredCountEl) unansweredCountEl.textContent = `${unansweredCount} Unanswered`;

  if (!grid) return;

  grid.innerHTML = currentQuiz.questions.map((q, idx) => {
    const isAnswered = userAnswers[q.id] !== undefined;
    const isActive = idx === currentQuestionIndex;

    return `
      <button type="button" class="question-nav-btn ${isAnswered ? 'answered' : ''} ${isActive ? 'active' : ''}" data-goto-index="${idx}" aria-label="Question ${idx + 1}: ${isActive ? 'Active' : isAnswered ? 'Answered' : 'Unanswered'}" ${isActive ? 'aria-current="step"' : ''}>
        ${idx + 1}
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.question-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gotoIdx = parseInt(btn.getAttribute('data-goto-index'), 10);
      if (!isNaN(gotoIdx)) {
        currentQuestionIndex = gotoIdx;
        renderCurrentQuestion();
        renderQuestionNavigator();
      }
    });
  });
}

function initQuizRunnerListeners() {
  const prevBtn = document.getElementById('quizPrevBtn');
  const nextBtn = document.getElementById('quizNextBtn');
  const clearBtn = document.getElementById('quizClearChoiceBtn');
  const submitBtn = document.getElementById('quizSubmitBtn');
  const confirmModalBtn = document.getElementById('confirmSubmitModalBtn');
  const exitBtn = document.getElementById('quizExitBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
        renderQuestionNavigator();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentQuestionIndex < currentQuiz.totalQuestions - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
        renderQuestionNavigator();
      } else {
        openSubmitConfirmationModal();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const q = currentQuiz.questions[currentQuestionIndex];
      if (q && userAnswers[q.id] !== undefined) {
        delete userAnswers[q.id];
        renderCurrentQuestion();
        renderQuestionNavigator();
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', openSubmitConfirmationModal);
  }

  if (confirmModalBtn) {
    confirmModalBtn.addEventListener('click', () => {
      const modalEl = document.getElementById('submitConfirmationModal');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
      submitQuizEvaluation(false);
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to exit? Your progress in this assessment will be discarded.')) {
        clearInterval(quizTimerInterval);
        document.getElementById('quizRunnerSection').classList.add('d-none');
        document.getElementById('overviewScreenSection').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}

function openSubmitConfirmationModal() {
  if (!currentQuiz) return;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = currentQuiz.totalQuestions - answeredCount;

  document.getElementById('modalAnsweredStats').innerHTML = `
    You have answered <strong>${answeredCount}</strong> out of <strong>${currentQuiz.totalQuestions}</strong> questions.
    ${unansweredCount > 0 ? `<div class="text-danger mt-1 small"><i class="bi bi-exclamation-circle me-1"></i>You have ${unansweredCount} unanswered question(s).</div>` : ''}
  `;

  const modalEl = document.getElementById('submitConfirmationModal');
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

/* --------------------------------------------------------------------------
   Screen 3: Accurate Answer Evaluation & Results Review
   -------------------------------------------------------------------------- */
function submitQuizEvaluation(isAutoSubmit = false) {
  if (isSubmittingQuiz) return;
  isSubmittingQuiz = true;
  clearInterval(quizTimerInterval);

  if (!currentQuiz) {
    isSubmittingQuiz = false;
    return;
  }

  const questions = currentQuiz.questions;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const evaluationResults = questions.map(q => {
    const selected = userAnswers[q.id];
    const isAttempted = selected !== undefined;
    const isCorrect = isAttempted && selected === q.correct;

    if (!isAttempted) unattemptedCount++;
    else if (isCorrect) correctCount++;
    else incorrectCount++;

    return {
      id: q.id,
      question: q.question,
      options: q.options,
      selected: selected,
      correct: q.correct,
      isCorrect: isCorrect,
      isAttempted: isAttempted,
      explanation: q.explanation
    };
  });

  const totalQuestions = questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  // Time taken
  const secondsElapsed = totalTimeSeconds - timeRemainingSeconds;
  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const timeTakenFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Performance tier
  let tier = "Needs Improvement";
  let tierBadge = "bg-danger";
  if (percentage >= 90) {
    tier = "Advanced";
    tierBadge = "bg-success";
  } else if (percentage >= 75) {
    tier = "Proficient";
    tierBadge = "bg-primary";
  } else if (percentage >= 60) {
    tier = "Intermediate";
    tierBadge = "bg-info text-dark";
  }

  // Record history
  const historyRecord = {
    id: `hist-${Date.now()}`,
    assessmentId: currentQuiz.id,
    title: currentQuiz.title,
    technology: currentQuiz.technology,
    score: correctCount,
    total: totalQuestions,
    percentage: percentage,
    tier: tier,
    tierBadge: tierBadge,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeTaken: timeTakenFormatted
  };

  AssessmentData.saveHistory(historyRecord);

  // Persist verified assessment to backend MySQL database
  try {
    const student = AssessmentData.getStudentProfile();
    const studentId = student.id || 'stud-101';
    fetch(`${(typeof window !== "undefined" && window.SkillBridgeConfig ? window.SkillBridgeConfig.apiBaseUrl : "http://localhost:5000/api")}/students/${encodeURIComponent(studentId)}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment_id: currentQuiz.id,
        title: currentQuiz.title,
        technology: currentQuiz.technology,
        score: correctCount,
        total_questions: totalQuestions,
        percentage: percentage
      })
    }).catch(err => console.warn('Could not persist assessment to backend:', err));
  } catch (e) {
    console.warn('Backend sync exception', e);
  }

  // Synchronize with dashboard assessments in localStorage if available
  try {
    const registered = localStorage.getItem('skillbridge_registered_student');
    if (registered) {
      const parsed = JSON.parse(registered);
      if (!parsed.skillScores) parsed.skillScores = {};
      parsed.skillScores[currentQuiz.id] = percentage;
      localStorage.setItem('skillbridge_registered_student', JSON.stringify(parsed));
    }
  } catch (e) {
    console.warn('Could not sync score to student profile', e);
  }

  // Render Results Screen
  renderResultsScreen(historyRecord, evaluationResults, currentQuiz);

  // Switch to Results View
  document.getElementById('quizRunnerSection').classList.add('d-none');
  document.getElementById('resultsScreenSection').classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  showAssessmentToast(`Assessment completed: ${correctCount} / ${totalQuestions} (${percentage}% score).`, 'success');
  setTimeout(() => { isSubmittingQuiz = false; }, 800);
}

function renderResultsScreen(summary, evaluationResults, quiz) {
  // Score circle & text
  const scoreCircle = document.getElementById('resultScoreCircle');
  if (scoreCircle) {
    scoreCircle.style.setProperty('--score-pct', summary.percentage);
  }

  document.getElementById('resultScorePercentage').textContent = `${summary.percentage}%`;
  document.getElementById('resultScoreRatio').textContent = `${summary.score} / ${summary.total}`;

  // Tech title & performance tier badge
  document.getElementById('resultTechnologyTitle').textContent = summary.title;
  const tierBadgeEl = document.getElementById('resultPerformanceTierBadge');
  if (tierBadgeEl) {
    tierBadgeEl.className = `badge ${summary.tierBadge} px-3 py-1 rounded-pill`;
    tierBadgeEl.textContent = `Proficiency: ${summary.tier} (Demo Result)`;
  }

  // Summary Metrics
  document.getElementById('resultCorrectCount').textContent = summary.score;
  document.getElementById('resultIncorrectCount').textContent = summary.total - summary.score;
  document.getElementById('resultTimeTaken').textContent = summary.timeTaken;

  // Strengths & Improvement recommendations
  const strengthsContainer = document.getElementById('resultStrengthsContainer');
  const improvementsContainer = document.getElementById('resultImprovementsContainer');

  if (strengthsContainer && improvementsContainer) {
    if (summary.percentage >= 80) {
      strengthsContainer.innerHTML = `
        <li class="mb-1"><i class="bi bi-check-circle-fill text-success me-1"></i> Strong understanding of fundamental and architectural concepts.</li>
        <li class="mb-1"><i class="bi bi-check-circle-fill text-success me-1"></i> Fast question processing speed (${summary.timeTaken} elapsed).</li>
        <li><i class="bi bi-check-circle-fill text-success me-1"></i> Eligible for premium high-stipend internship recommendations.</li>
      `;
      improvementsContainer.innerHTML = `
        <li class="mb-1"><i class="bi bi-arrow-right-circle text-primary me-1"></i> Explore advanced enterprise design patterns and concurrency profiling.</li>
        <li><i class="bi bi-arrow-right-circle text-primary me-1"></i> Retake after 14 days to benchmark score stability.</li>
      `;
    } else {
      strengthsContainer.innerHTML = `
        <li class="mb-1"><i class="bi bi-check-circle-fill text-success me-1"></i> Attempted core foundational questions across ${quiz.technology}.</li>
        <li><i class="bi bi-check-circle-fill text-success me-1"></i> Good baseline knowledge to build on with hands-on practice modules.</li>
      `;
      improvementsContainer.innerHTML = `
        <li class="mb-1"><i class="bi bi-exclamation-circle text-warning me-1"></i> Review incorrect answers below in the detailed question breakdown.</li>
        <li class="mb-1"><i class="bi bi-exclamation-circle text-warning me-1"></i> Revisit key topics in the Skill Gap roadmap on the dashboard.</li>
        <li><i class="bi bi-exclamation-circle text-warning me-1"></i> Retake this assessment to reach at least 80% competency.</li>
      `;
    }
  }

  // Detailed Question-by-Question Review
  const reviewContainer = document.getElementById('resultQuestionsReviewList');
  if (reviewContainer) {
    const letters = ['A', 'B', 'C', 'D'];

    reviewContainer.innerHTML = evaluationResults.map((item, idx) => {
      const isCorrect = item.isCorrect;
      const isUnattempted = !item.isAttempted;

      let statusBadge = '';
      if (isCorrect) {
        statusBadge = '<span class="badge bg-success px-2 py-1"><i class="bi bi-check-lg me-1"></i>Correct (+1)</span>';
      } else if (isUnattempted) {
        statusBadge = '<span class="badge bg-secondary px-2 py-1"><i class="bi bi-dash-circle me-1"></i>Unattempted (0)</span>';
      } else {
        statusBadge = '<span class="badge bg-danger px-2 py-1"><i class="bi bi-x-lg me-1"></i>Incorrect (0)</span>';
      }

      return `
        <div class="card border mb-3 rounded-3 bg-white p-3 shadow-xs">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold text-dark small">Question ${idx + 1}</span>
            ${statusBadge}
          </div>

          <p class="text-dark fw-semibold small mb-3">${item.question}</p>

          <div class="row g-2 mb-3">
            ${item.options.map((opt, optIdx) => {
              let optionClass = 'bg-light text-muted border';
              let indicator = '';

              if (optIdx === item.correct) {
                optionClass = 'bg-soft-emerald text-success border-success-subtle fw-bold';
                indicator = '<i class="bi bi-check-circle-fill text-success ms-auto"></i>';
              } else if (optIdx === item.selected && !isCorrect) {
                optionClass = 'bg-soft-pink text-danger border-danger-subtle fw-semibold';
                indicator = '<i class="bi bi-x-circle-fill text-danger ms-auto"></i>';
              }

              return `
                <div class="col-12 col-md-6">
                  <div class="p-2 rounded-2 ${optionClass} d-flex align-items-center gap-2 small">
                    <span class="badge bg-white text-dark border">${letters[optIdx]}</span>
                    <span>${opt}</span>
                    ${indicator}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="alert alert-light border small text-muted p-2 mb-0" style="font-size: 0.78rem;">
            <i class="bi bi-lightbulb-fill text-warning me-1"></i><strong>Explanation:</strong> ${item.explanation}
          </div>
        </div>
      `;
    }).join('');
  }

  // Retake and Return buttons
  const retakeBtn = document.getElementById('resultRetakeBtn');
  const returnBtn = document.getElementById('resultReturnCatalogBtn');

  if (retakeBtn) {
    retakeBtn.onclick = () => {
      startAssessment(quiz.id);
    };
  }

  if (returnBtn) {
    returnBtn.onclick = () => {
      document.getElementById('resultsScreenSection').classList.add('d-none');
      document.getElementById('overviewScreenSection').classList.remove('d-none');
      renderHistoryTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
}

/* --------------------------------------------------------------------------
   Mobile Sidebar Toggle & Logout Actions
   -------------------------------------------------------------------------- */
function initMobileSidebarToggle() {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const closeBtn = document.getElementById('mobileSidebarClose');
  const backdrop = document.getElementById('dashboardSidebarBackdrop');
  const sidebar = document.getElementById('dashboardSidebar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('show');
      if (backdrop) backdrop.classList.add('show');
    });
  }

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
}

function initLogoutHandler() {
  const logoutButtons = document.querySelectorAll('.dashboard-logout-trigger');

  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out of your student portal?')) {
        try {
          // Clear student-specific session keys without affecting recruiter keys
          localStorage.removeItem('skillbridge_student_session');
          localStorage.removeItem('skillbridge_registered_student');
          localStorage.removeItem('skillbridge_active_session');
          if (localStorage.getItem('skillbridge_auth_role') === 'student') {
            localStorage.removeItem('skillbridge_auth_role');
          }
          sessionStorage.removeItem('skillbridge_student_session');
          sessionStorage.removeItem('skillbridge_registered_student');
          sessionStorage.removeItem('skillbridge_active_session');
          if (sessionStorage.getItem('skillbridge_auth_role') === 'student') {
            sessionStorage.removeItem('skillbridge_auth_role');
          }
        } catch (e) {
          console.warn('Session cleanup exception', e);
        }

        showAssessmentToast('Logging out... Redirecting to login page.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
      }
    });
  });
}

function showAssessmentToast(message, type = 'info') {
  let toastContainer = document.getElementById('assessmentToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'assessmentToastContainer';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1090';
    document.body.appendChild(toastContainer);
  }

  const toastId = `toast-${Date.now()}`;
  let icon = 'bi-info-circle-fill text-info';
  let borderClass = 'border-info';

  if (type === 'success') {
    icon = 'bi-check-circle-fill text-success';
    borderClass = 'border-success';
  } else if (type === 'warning') {
    icon = 'bi-exclamation-triangle-fill text-warning';
    borderClass = 'border-warning';
  }

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center bg-white border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex align-items-center p-3 border-start border-4 ${borderClass}">
        <i class="bi ${icon} fs-5 me-2 flex-shrink-0"></i>
        <div class="toast-body p-0 small fw-medium text-dark flex-grow-1">
          ${message}
        </div>
        <button type="button" class="btn-close ms-2 me-0" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  if (toastElement && window.bootstrap && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
    bsToast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }
}
