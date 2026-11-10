#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

src=src/main/java/ca/bazlur
two_carriers=(-Djdk.virtualThreadScheduler.parallelism=2 -Djdk.virtualThreadScheduler.maxPoolSize=2)

run() {
  echo "\$ $*"
  "$@"
}

case "$1" in
  intro)      run java $src/Intro.java ;;
  overload)   run java $src/queues/OverloadUnbounded.java ;;
  bounded)    run java $src/queues/OverloadBounded.java ;;
  wide)       run java $src/contention/ContentionWide.java ;;
  narrow)     run java $src/contention/ContentionNarrow.java ;;
  pinning)    run java "${two_carriers[@]}" $src/contention/PinningProbe.java ;;
  leak)       run java $src/lifetime/TimeoutLeak.java ;;
  cancel)     run java $src/lifetime/TimeoutCancel.java ;;
  structured) run java --enable-preview $src/lifetime/TimeoutStructured.java ;;
  *)          echo "usage: ./run.sh intro|overload|bounded|wide|narrow|pinning|leak|cancel|structured" ;;
esac
