:- use_module(library(clpfd)).

% ============================================================
% AI EXAM SEATING ARRANGEMENT GENERATOR
% Constraint Satisfaction Problem using CLPFD
% ============================================================


% ============================================================
% INPUT UTILITIES
% ============================================================

read_integer(Prompt, Number) :-
    repeat,
    write(Prompt),
    read_line_to_string(user_input, Line),
    catch(number_string(Value, Line), _, fail),
    integer(Value),
    !,
    Number = Value.


read_positive_integer(Prompt, Number) :-
    repeat,
    write(Prompt),
    read_line_to_string(user_input, Line),
    catch(number_string(Value, Line), _, fail),
    integer(Value),
    Value > 0,
    !,
    Number = Value.


read_nonnegative_integer(Prompt, Number) :-
    repeat,
    write(Prompt),
    read_line_to_string(user_input, Line),
    catch(number_string(Value, Line), _, fail),
    integer(Value),
    Value >= 0,
    !,
    Number = Value.


read_atom(Prompt, Atom) :-
    repeat,
    write(Prompt),
    read_line_to_string(user_input, Line),
    normalize_space(string(Clean), Line),
    Clean \= "",
    atom_string(Atom, Clean),
    !.


% ============================================================
% ROOM INPUT
% ============================================================

read_rooms(Current, Total, []) :-
    Current > Total,
    !.

read_rooms(Current, Total, [room(Current, Rows, Cols, Blocked)|Rest]) :-

    nl,
    format('========== ROOM ~w =========~n', [Current]),

    read_positive_integer(
        'Number of rows: ',
        Rows
    ),

    read_positive_integer(
        'Number of columns: ',
        Cols
    ),

    Capacity is Rows * Cols,

    format(
        'Total seats in Room ~w = ~w~n',
        [Current, Capacity]
    ),

    read_nonnegative_integer(
        'Number of blocked seats: ',
        BlockedCount
    ),

    (
        BlockedCount =< Capacity
        ->
        true
        ;
        format(
            'ERROR: blocked seats cannot exceed ~w.~n',
            [Capacity]
        ),
        fail
    ),

    read_blocked_seats(
        BlockedCount,
        Capacity,
        [],
        Blocked
    ),

    Next is Current + 1,

    read_rooms(
        Next,
        Total,
        Rest
    ).


% ============================================================
% BLOCKED SEATS
% ============================================================

read_blocked_seats(
    0,
    _,
    Acc,
    Acc
) :-
    !.

read_blocked_seats(
    Count,
    Capacity,
    Acc,
    Blocked
) :-

    format(
        'Enter blocked seat number (1-~w): ',
        [Capacity]
    ),

    read_line_to_string(
        user_input,
        Line
    ),

    catch(
        number_string(Seat, Line),
        _,
        fail
    ),

    integer(Seat),
    Seat >= 1,
    Seat =< Capacity,
    \+ memberchk(Seat, Acc),

    !,

    NewCount is Count - 1,

    read_blocked_seats(
        NewCount,
        Capacity,
        [Seat|Acc],
        Blocked
    ).

read_blocked_seats(
    Count,
    Capacity,
    Acc,
    Blocked
) :-

    write('Invalid or duplicate seat number. Try again.'),
    nl,

    read_blocked_seats(
        Count,
        Capacity,
        Acc,
        Blocked
    ).


% ============================================================
% STUDENT GROUP INPUT
% ============================================================

read_groups(Current, Total, []) :-
    Current > Total,
    !.

read_groups(
    Current,
    Total,
    [group(Class, Branch, Count)|Rest]
) :-

    nl,
    format(
        '========== STUDENT GROUP ~w =========~n',
        [Current]
    ),

    read_atom(
        'class name(Branch) : ',
        Class
    ),

    read_atom(
        'subject: ',
        Branch
    ),

    read_positive_integer(
        'Number of students in this group: ',
        Count
    ),

    Next is Current + 1,

    read_groups(
        Next,
        Total,
        Rest
    ).


% ============================================================
% GENERATE STUDENTS
% ============================================================

generate_students(Groups, Students) :-
    generate_students(
        Groups,
        1,
        Students
    ).


generate_students([], _, []).

generate_students(
    [group(Class, Branch, PinList)|Rest],
    GroupNumber,
    Students
) :-
    is_list(PinList),
    !,
    generate_group_students_from_pins(
        Class,
        Branch,
        PinList,
        CurrentStudents
    ),
    NextGroup is GroupNumber + 1,
    generate_students(
        Rest,
        NextGroup,
        RemainingStudents
    ),
    append(
        CurrentStudents,
        RemainingStudents,
        Students
    ).

generate_students(
    [group(Class, Branch, Count)|Rest],
    GroupNumber,
    Students
) :-
    generate_group_students(
        GroupNumber,
        Class,
        Branch,
        1,
        Count,
        CurrentStudents
    ),
    NextGroup is GroupNumber + 1,
    generate_students(
        Rest,
        NextGroup,
        RemainingStudents
    ),
    append(
        CurrentStudents,
        RemainingStudents,
        Students
    ).

generate_group_students_from_pins(_, _, [], []).
generate_group_students_from_pins(Class, Branch, [Pin|Rest], [student(Pin, Class, Branch)|Remaining]) :-
    generate_group_students_from_pins(Class, Branch, Rest, Remaining).


generate_group_students(
    _,
    _,
    _,
    Current,
    Count,
    []
) :-
    Current > Count,
    !.

generate_group_students(
    GroupNumber,
    Class,
    Branch,
    Current,
    Count,
    [student(ID, Class, Branch)|Rest]
) :-

    format(
        atom(ID),
        'S~w_~w',
        [GroupNumber, Current]
    ),

    Next is Current + 1,

    generate_group_students(
        GroupNumber,
        Class,
        Branch,
        Next,
        Count,
        Rest
    ).


% ============================================================
% GENERATE ALL USABLE SEATS
%
% Seat is represented as:
%
% seat(RoomNumber, SeatNumber, NumberOfColumns)
%
% ============================================================

generate_usable_seats(Rooms, Seats) :-

    findall(
        seat(Room, SeatNumber, Cols),

        (
            member(
                room(Room, Rows, Cols, Blocked),
                Rooms
            ),

            Capacity is Rows * Cols,

            between(
                1,
                Capacity,
                SeatNumber
            ),

            \+ memberchk(
                SeatNumber,
                Blocked
            )
        ),

        Seats
    ).


% ============================================================
% CAPACITY
% ============================================================

total_capacity(Rooms, Total) :-

    findall(
        Capacity,

        (
            member(
                room(_, Rows, Cols, _),
                Rooms
            ),

            Capacity is Rows * Cols
        ),

        Capacities
    ),

    sum_list(
        Capacities,
        Total
    ).


usable_capacity(Rooms, Total) :-

    generate_usable_seats(
        Rooms,
        Seats
    ),

    length(
        Seats,
        Total
    ).


% ============================================================
% ADJACENCY
%
% Two seats are adjacent only if they are in the SAME room.
% ============================================================


% Horizontal right

adjacent(
    seat(Room, Seat1, Cols),
    seat(Room, Seat2, Cols)
) :-

    Seat2 is Seat1 + 1,

    Seat1 mod Cols =\= 0.


% Horizontal left

adjacent(
    seat(Room, Seat1, Cols),
    seat(Room, Seat2, Cols)
) :-

    Seat1 is Seat2 + 1,

    Seat2 mod Cols =\= 0.


% Vertical down

adjacent(
    seat(Room, Seat1, Cols),
    seat(Room, Seat2, Cols)
) :-

    Seat2 is Seat1 + Cols.


% Vertical up

adjacent(
    seat(Room, Seat1, Cols),
    seat(Room, Seat2, Cols)
) :-

    Seat1 is Seat2 + Cols.


% ============================================================
% CREATE ALLOWED SEAT PAIRS
%
% For students that cannot sit together,
% their seats must NOT be adjacent.
% ============================================================

create_allowed_pairs(
    Seats,
    AllowedPairs
) :-

    length(
        Seats,
        N
    ),

    findall(
        [A, B],

        (
            between(1, N, A),
            between(1, N, B),

            A \= B,

            nth1(A, Seats, SeatA),
            nth1(B, Seats, SeatB),

            \+ adjacent(SeatA, SeatB)
        ),

        AllowedPairs
    ).


% ============================================================
% STUDENT COMPATIBILITY
%
% Same class OR same branch = cannot be adjacent.
% ============================================================

students_conflict(
    student(_, Class1, Branch1),
    student(_, Class2, Branch2)
) :-

    (
        Class1 == Class2
        ;
        Branch1 == Branch2
    ).


% ============================================================
% APPLY CONSTRAINTS TO STUDENTS
% ============================================================

apply_constraints(
    [],
    [],
    _,
    _
).


apply_constraints(
    [Student|Students],
    [SeatVar|SeatVars],
    AllStudents,
    AllowedPairs
) :-

    apply_against_previous(
        Student,
        SeatVar,
        Students,
        SeatVars,
        AllStudents,
        AllowedPairs
    ),

    apply_constraints(
        Students,
        SeatVars,
        AllStudents,
        AllowedPairs
    ).


% ============================================================
% APPLY CONSTRAINT BETWEEN STUDENT PAIRS
% ============================================================

apply_against_previous(
    _,
    _,
    [],
    [],
    _,
    _
).

apply_against_previous(
    Student1,
    SeatVar1,
    [Student2|RestStudents],
    [SeatVar2|RestVars],
    AllStudents,
    AllowedPairs
) :-

    (
        students_conflict(
            Student1,
            Student2
        )

        ->

        tuples_in(
            [[SeatVar1, SeatVar2]],
            AllowedPairs
        )

        ;

        true
    ),

    apply_against_previous(
        Student1,
        SeatVar1,
        RestStudents,
        RestVars,
        AllStudents,
        AllowedPairs
    ).


% ============================================================
% SOLVE USING CLPFD
% ============================================================

solve(
    Students,
    Rooms,
    Arrangement
) :-

    generate_usable_seats(
        Rooms,
        Seats
    ),

    length(
        Students,
        NumberOfStudents
    ),

    length(
        Seats,
        NumberOfSeats
    ),

    NumberOfStudents =< NumberOfSeats,

    % One variable for each student
    length(
        SeatVariables,
        NumberOfStudents
    ),

    % Every variable represents an index into Seats
    SeatVariables ins 1..NumberOfSeats,

    % No two students can use the same seat
    all_distinct(
        SeatVariables
    ),

    % Create valid seat combinations
    create_allowed_pairs(
        Seats,
        AllowedPairs
    ),

    % Apply same-class and same-branch constraints
    apply_constraints(
        Students,
        SeatVariables,
        Students,
        AllowedPairs
    ),

    % Search for a solution
    labeling(
        [ffc],
        SeatVariables
    ),

    % Convert seat indexes into actual room/seat values
    make_arrangement(
        Students,
        SeatVariables,
        Seats,
        Arrangement
    ).


% ============================================================
% CONVERT SOLUTION INTO ASSIGNMENTS
% ============================================================

make_arrangement(
    [],
    [],
    _,
    []
).

make_arrangement(
    [student(ID, Class, Branch)|Students],
    [SeatIndex|Indexes],
    Seats,
    [
        assignment(
            ID,
            Class,
            Branch,
            ActualSeat
        )
        |Rest
    ]
) :-

    nth1(
        SeatIndex,
        Seats,
        ActualSeat
    ),

    make_arrangement(
        Students,
        Indexes,
        Seats,
        Rest
    ).


% ============================================================
% DISPLAY A SINGLE SEAT
% ============================================================

display_seat(
    Room,
    SeatNumber,
    Blocked,
    Arrangement
) :-

    memberchk(
        SeatNumber,
        Blocked
    ),

    !,

    write('[X]       ').


display_seat(
    Room,
    SeatNumber,
    _,
    Arrangement
) :-

    memberchk(
        assignment(
            ID,
            _,
            _,
            seat(Room, SeatNumber, _)
        ),
        Arrangement
    ),

    !,

    format(
        '~w       ',
        [ID]
    ).


display_seat(
    _,
    _,
    _,
    _
) :-

    write('[ ]       ').


% ============================================================
% DISPLAY ONE ROOM
% ============================================================

display_room(
    Room,
    Rows,
    Cols,
    Blocked,
    Arrangement
) :-

    nl,

    format(
        '==================================================~n'
    ),

    format(
        'ROOM ~w   (~w rows x ~w columns)~n',
        [Room, Rows, Cols]
    ),

    format(
        '==================================================~n'
    ),

    write('          '),

    display_column_numbers(
        1,
        Cols
    ),

    nl,

    display_room_rows(
        1,
        Rows,
        Room,
        Cols,
        Blocked,
        Arrangement
    ).


% ============================================================
% DISPLAY COLUMN NUMBERS
% ============================================================

display_column_numbers(
    Current,
    Max
) :-

    Current > Max,
    !.

display_column_numbers(
    Current,
    Max
) :-

    format(
        'C~w       ',
        [Current]
    ),

    Next is Current + 1,

    display_column_numbers(
        Next,
        Max
    ).


% ============================================================
% DISPLAY ROWS
% ============================================================

display_room_rows(
    Row,
    MaxRows,
    _,
    _,
    _,
    _
) :-

    Row > MaxRows,
    !.

display_room_rows(
    Row,
    MaxRows,
    Room,
    Cols,
    Blocked,
    Arrangement
) :-

    format(
        'R~w        ',
        [Row]
    ),

    display_row_seats(
        Row,
        1,
        Cols,
        Room,
        Blocked,
        Arrangement
    ),

    nl,

    NextRow is Row + 1,

    display_room_rows(
        NextRow,
        MaxRows,
        Room,
        Cols,
        Blocked,
        Arrangement
    ).


% ============================================================
% DISPLAY SEATS IN ONE ROW
% ============================================================

display_row_seats(
    _,
    Column,
    Max,
    _,
    _,
    _
) :-

    Column > Max,
    !.

display_row_seats(
    Row,
    Column,
    Max,
    Room,
    Blocked,
    Arrangement
) :-

    SeatNumber is
        ((Row - 1) * Max) + Column,

    display_seat(
        Room,
        SeatNumber,
        Blocked,
        Arrangement
    ),

    NextColumn is Column + 1,

    display_row_seats(
        Row,
        NextColumn,
        Max,
        Room,
        Blocked,
        Arrangement
    ).


% ============================================================
% DISPLAY ALL ROOMS
% ============================================================

display_all_rooms(
    [],
    _
).

display_all_rooms(
    [
        room(
            Room,
            Rows,
            Cols,
            Blocked
        )
        |Rest
    ],
    Arrangement
) :-

    display_room(
        Room,
        Rows,
        Cols,
        Blocked,
        Arrangement
    ),

    display_all_rooms(
        Rest,
        Arrangement
    ).


% ============================================================
% FINAL DISPLAY
% ============================================================

display_result(
    Rooms,
    Arrangement
) :-

    nl,

    write(
        '======================================================'
    ),
    nl,

    write(
        '               Exam seating arrangement'
    ),
    nl,

    write(
        '======================================================'
    ),
    nl,

    display_all_rooms(
        Rooms,
        Arrangement
    ),

    nl,

    write(
        '[X] = BLOCKED SEAT'
    ),
    nl,

    write(
        '[ ] = EMPTY SEAT'
    ),
    nl,

    write(
        '======================================================'
    ),
    nl.


% ============================================================
% MAIN PROGRAM
% ============================================================

start :-

    nl,

    write(
        '======================================================'
    ),
    nl,

    write(
        '               Exam seating arrangement'
    ),
    nl,

    write(
        '======================================================'
    ),
    nl,

    % --------------------------------------------------------
    % NUMBER OF ROOMS
    % --------------------------------------------------------

    read_positive_integer(
        'Number of rooms: ',
        NumberOfRooms
    ),

    % --------------------------------------------------------
    % ROOM DETAILS
    % --------------------------------------------------------

    read_rooms(
        1,
        NumberOfRooms,
        Rooms
    ),

    % --------------------------------------------------------
    % CAPACITY
    % --------------------------------------------------------

    total_capacity(
        Rooms,
        TotalCapacity
    ),

    usable_capacity(
        Rooms,
        UsableCapacity
    ),

    nl,

    format(
        'Total room capacity : ~w~n',
        [TotalCapacity]
    ),

    format(
        'Usable seat capacity: ~w~n',
        [UsableCapacity]
    ),

    % --------------------------------------------------------
    % NUMBER OF STUDENT GROUPS
    % --------------------------------------------------------

    nl,

    read_positive_integer(
        'Number of classes/sections: ',
        NumberOfGroups
    ),

    % --------------------------------------------------------
    % GROUP DETAILS
    % --------------------------------------------------------

    read_groups(
        1,
        NumberOfGroups,
        Groups
    ),

    % --------------------------------------------------------
    % GENERATE STUDENTS
    % --------------------------------------------------------

    generate_students(
        Groups,
        Students
    ),

    length(
        Students,
        NumberOfStudents
    ),

    nl,

    format(
        'Total students: ~w~n',
        [NumberOfStudents]
    ),

    % --------------------------------------------------------
    % CAPACITY CHECK
    % --------------------------------------------------------

    (
        NumberOfStudents > UsableCapacity

        ->

        nl,

        write(
            'ERROR: Not enough usable seats.'
        ),
        nl,

        format(
            'Students       : ~w~n',
            [NumberOfStudents]
        ),

        format(
            'Usable seats   : ~w~n',
            [UsableCapacity]
        )

        ;

        % ----------------------------------------------------
        % SOLVE
        % ----------------------------------------------------

        nl,

        write(
            'Searching for a valid seating arrangement...'
        ),
        nl,

        (
            solve(
                Students,
                Rooms,
                Arrangement
            )

            ->

            nl,

            write(
                'VALID SEATING ARRANGEMENT FOUND!'
            ),
            nl,

            display_result(
                Rooms,
                Arrangement
            )

            ;

            nl,

            write(
                'NO VALID SEATING ARRANGEMENT FOUND.'
            ),
            nl,

            write(
                'The constraints may be too restrictive.'
            ),
            nl,

            write(
                'Try increasing the number of seats/rooms'
            ),
            nl,

            write(
                'or reducing the number of students in'
            ),
            nl,

            write(
                'the same class or branch.'
            ),
            nl
        )
    ).
