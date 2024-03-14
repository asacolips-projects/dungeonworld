#!/bin/bash

REGEX="beta|alpha"

# If this is a branch, return it.
if [ "${REF_TYPE}" == 'branch' ]; then
  BRANCH=$REF
else
  # If this is a tag with "beta" or "alpha", return that part.
  if [[ $REF =~ $REGEX ]]; then
    BRANCH=`echo $REF | sed -r "s/.*($REGEX).*/\1/"`
  # Fallback to master.
  else
    BRANCH='master'
  fi
fi
