#!/bin/bash

#
# usage:
#.$ /reverse.sh -d <db-name> [-c] [-p ./] [-t <task>]
#
# -d = db name
# -p = Propagates.java path
# -t = ant task name

###################################################

PROPAGATE_JAVA="./Propagates.java"
ANT_BUILD_TASK=""
EPIC_GEN="$HOME/bin/epic-rev-gen"
EPIC_ERR="$HOME/bin/epic-rev-load"
EPIC_TMP="./epic-tmp"
EPIC_DB=0
CONTINUE=0

while getopts :d:t:p:c params
do
    case $params in
        d) EPIC_DB=$OPTARG
            ;;
        t) ANT_BUILD_TASK=$OPTARG
            ;;
        c) CONTINUE=$OPTARG
            ;;
        p) PROPAGATE_JAVA="$OPTARG/Propagates.java"
            ;;
        ?) echo "invalid"
            exit 1
            ;;
    esac
done

if [ "$EPIC_DB" == 0 ]; then
    echo "Missing EPIC_DB"
    exit 1
fi

###################################################

echo "mongo DB: $EPIC_DB"
echo "ant task: $ANT_BUILD_TASK"
echo "continue: $CONTINUE"
echo "propagates: $PROPAGATE_JAVA"

export EPIC_ERR EPIC_DB


if [ "$CONTINUE" == 0 ]; then
    echo "Starting..."
    mongo $EPIC_DB --eval "db.dropDatabase();" > /dev/null
    rm -rf $EPIC_TMP
    mkdir $EPIC_TMP
    rm -f ant-rev.log
fi

i=$CONTINUE

$EPIC_GEN $EPIC_DB > $EPIC_TMP/Propagates.java.$i;
cp $EPIC_TMP/Propagates.java.$i $PROPAGATE_JAVA

####


while [ true ]; do
    echo " ==== Iteration $i ==== "

    echo -n "ant cleaning..."
    ant clean > /dev/null;

    echo -n "done. Building..."
    ant $ANT_BUILD_TASK &>> ant-rev.log;
    succ=$?
    echo "Done."

    if [ "$succ" == 0 ]; then
        echo "Build completed in $i iterations\n"
        exit 0
    fi

    echo -e "ant errors:"
    grep '\[javac\].*error' ant-rev.log
    echo -e "\n"

    #echo -e $antres | grep '\[javac\].*error'
    ## generating Propagates.java
    $EPIC_GEN $EPIC_DB > $EPIC_TMP/Propagates.java.$i;
    if [ "$i" != 0 ]; then
        k=$(($i-1))
        diffp=`diff $EPIC_TMP/Propagates.java.$i $EPIC_TMP/Propagates.java.$k`
        if [ "$?" == 0 ]; then
            echo ">> Something wrong: no new declarations were created [iteration $i]"
            exit 1
        else
            echo "new propagates:"
            echo "$diffp"
            echo ""
        fi
    fi
    cp $EPIC_TMP/Propagates.java.$i $PROPAGATE_JAVA

    i=$(($i+1))
    echo -e "------------------------\n"
done
